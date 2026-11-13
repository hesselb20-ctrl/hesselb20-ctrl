// tracekit: the committed example analysis in three layers.
// Bottom: the 17 entries of examples/session.har in recorded order (entry 0 is the HTML page, dropped).
// Middle: the 7 endpoints they cluster into (examples/generated/tracekit.json, operations).
// Top: the three outputs. Arcs between endpoints are the real call-graph edges (auth and data).
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

const CAM: Cam = { position: [0, 7.4, 14], target: [0.9, 1.9, 0], fov: 37 };

// examples/generated/tracekit.json -> operations (id, calls)
const OPS = ['login', 'getMe', 'listTodos', 'getTodo', 'createTodo', 'updateTodo', 'deleteTodo'];
// examples/session.har -> entries 0..16, mapped to the operation index they cluster into (-1 = not an API call)
// 0 GET /, 1 POST /api/login, 2 GET /api/me, 3 GET /api/todos, 4 GET /api/todos/17, 5 GET /api/todos/42,
// 6-7 POST /api/todos, 8 GET /api/todos/109, 9-10 PATCH /api/todos/{42,109}, 11-12 GET /api/todos?done=,
// 13-14 DELETE /api/todos/{110,108}, 15 GET /api/todos/108 (404), 16 GET /api/todos
const ENTRY_OP = [-1, 0, 1, 2, 3, 3, 4, 4, 3, 5, 5, 2, 2, 6, 6, 3, 2];
// graph.edges with kind auth / data
const AUTH = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]];
const DATA = [[2, 3], [2, 5], [2, 6], [4, 3], [4, 5], [4, 6]];
const OUTS = ['openapi.yaml', 'sdk/', 'mcp-server/'];

const Y0 = 0, Y1 = 2.0, Y2 = 4.0;
const ex = (i: number) => -5.6 + i * 0.7; // 17 entries
const ox = (j: number) => -5.1 + j * 1.7; // 7 endpoints
const outx = (j: number) => -3.9 + j * 3.9; // 3 outputs
const N = 20; // 17 entries + 3 quiet slots per loop

const segGeom = (pts: THREE.Vector3[]) => {
  const arr: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) arr.push(...pts[i].toArray(), ...pts[i + 1].toArray());
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return g;
};
const Lines: React.FC<{ geometry: THREE.BufferGeometry; color: string; opacity?: number }> = ({ geometry, color, opacity = 1 }) => (
  <lineSegments geometry={geometry}><lineBasicMaterial color={color} transparent opacity={opacity} /></lineSegments>
);
const arc = (a: number, b: number, side: number) => {
  const p0 = new THREE.Vector3(ox(a), Y1 + 0.09, side * 0.42);
  const p2 = new THREE.Vector3(ox(b), Y1 + 0.09, side * 0.42);
  const p1 = new THREE.Vector3((ox(a) + ox(b)) / 2, Y1 + 0.09, side * (0.55 + 0.16 * Math.abs(b - a)));
  return new THREE.QuadraticBezierCurve3(p0, p1, p2).getPoints(24);
};

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;

  const geo = useMemo(() => ({
    tile: new THREE.BoxGeometry(0.46, 0.06, 0.46),
    slab: new THREE.BoxGeometry(1.25, 0.12, 0.84),
    out: new THREE.BoxGeometry(2.9, 0.16, 1.0),
    plates: [Y0, Y1, Y2].map((y) => segGeom([[-6.2, -1.6], [6.4, -1.6], [6.4, 1.6], [-6.2, 1.6], [-6.2, -1.6]].map(([x, z]) => new THREE.Vector3(x, y - 0.07, z)))),
    links: ENTRY_OP.map((o, i) => (o < 0 ? null : segGeom([new THREE.Vector3(ex(i), Y0 + 0.04, 0), new THREE.Vector3(ox(o), Y1 - 0.07, 0)]))),
    auth: AUTH.map(([a, b]) => segGeom(arc(a, b, -1))),
    data: DATA.map(([a, b]) => segGeom(arc(a, b, 1))),
  }), []);
  // endpoint-to-output links as plain pairs
  const up = useMemo(() => {
    const arr: number[] = [];
    OPS.forEach((_, o) => OUTS.forEach((__, j) => arr.push(ox(o), Y1 + 0.07, 0, outx(j), Y2 - 0.09, 0)));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, []);

  // lighting: entries in recorded order, a soft window that wraps seamlessly
  const s = phase * N;
  const lit = ENTRY_OP.map((_, i) => {
    let d = s - i - 0.5;
    d = ((d % N) + N + N / 2) % N - N / 2;
    return Math.max(0, 1 - Math.abs(d) / 1.4);
  });
  const opLit = OPS.map((_, o) => Math.max(0, ...ENTRY_OP.map((e, i) => (e === o ? lit[i] : 0))));
  const outLit = Math.max(...opLit) * 0.5;

  const P = (p: [number, number, number]) => toScreen(p, CAM, width, height);
  const lbl = labelStyle(pal, k);
  const right = (y: number, text: string, sub: string) => {
    const p = P([6.55, y, 0]);
    return <div style={{ ...lbl, position: 'absolute', left: p.x + 10 * k, top: p.y - 12 * k, lineHeight: 1.45 }}>
      <div style={{ color: pal.ink }}>{text}</div><div style={{ fontSize: 9 * k }}>{sub}</div></div>;
  };
  const login = P([ox(0) - 0.6, Y1, 0.42]);

  return (
    <Stage theme={theme} cam={CAM} grid={false}
      overlay={<>
        <div style={{ ...lbl, position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>One recording, analysed</div>
          <div>examples/session.har · local demo todo API, recorded by script</div>
        </div>
        {right(Y2, 'Outputs', '3 generated')}
        {right(Y1, 'Endpoints', '7 templates')}
        {right(Y0, 'Recorded entries', '17, in order')}
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${login.x} ${login.y}L${login.x - 18 * k} ${login.y + 34 * k}H${28 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} />
        </svg>
        <div style={{ ...lbl, position: 'absolute', left: 28 * k, top: login.y + 38 * k, color: pal.ink, lineHeight: 1.35 }}>POST /api/login<div style={{ color: pal.mute, fontSize: 9 * k }}>issues the token</div></div>
        {OUTS.map((t, j) => {
          const p = P([outx(j), Y2 + 0.1, -0.5]);
          return <div key={t} style={{ ...lbl, position: 'absolute', left: p.x, top: p.y - 22 * k, transform: 'translateX(-50%)', color: pal.ink, textTransform: 'none', letterSpacing: '0.08em' }}>{t}</div>;
        })}
        <div style={{ ...lbl, position: 'absolute', left: 28 * k, bottom: 18 * k, fontSize: 9 * k, lineHeight: 1.6 }}>
          <div>Back arcs · auth from login (6)</div>
          <div>Front arcs · ids passed between calls (6)</div>
          <div>Hollow tile · HTML page, dropped</div>
        </div>
      </>}>
      {/* layer plates */}
      {geo.plates.map((g, i) => <Lines key={'p' + i} geometry={g} color={pal.e1} opacity={0.6} />)}
      {/* entries */}
      {ENTRY_OP.map((o, i) => (
        o < 0
          ? <Solid key={i} geometry={geo.tile} fill={pal.bg} edge={pal.e1} position={[ex(i), Y0, 0]} />
          : <Solid key={i} geometry={geo.tile} fill={mix(pal.e0, pal.hi, lit[i])} edge={mix(pal.e1, pal.hi, 0.35 + 0.65 * lit[i])} position={[ex(i), Y0, 0]} />
      ))}
      {geo.links.map((g, i) => g && <Lines key={i} geometry={g} color={mix(pal.e0, pal.accent, lit[i])} />)}
      {/* endpoints */}
      {OPS.map((op, o) => (
        <Solid key={op} geometry={geo.slab} fill={mix(pal.f1, pal.hi, 0.75 * opLit[o])} edge={mix(pal.e1, pal.hi, 0.5 + 0.5 * opLit[o])} position={[ox(o), Y1, 0]} />
      ))}
      {geo.auth.map((g, i) => <Lines key={'a' + i} geometry={g} color={mix(pal.mute, pal.accent, opLit[AUTH[i][1]])} />)}
      {geo.data.map((g, i) => <Lines key={"d" + i} geometry={g} color={pal.mute} opacity={0.7} />)}
      <Lines geometry={up} color={pal.e0} opacity={0.7} />
      {/* outputs */}
      {OUTS.map((t, j) => (
        <Solid key={t} geometry={geo.out} fill={mix(pal.f1, pal.hi, outLit * 0.3)} edge={mix(pal.e1, pal.hi, 0.4 + outLit)} position={[outx(j), Y2, 0]} />
      ))}
    </Stage>
  );
};
export default Scene;
