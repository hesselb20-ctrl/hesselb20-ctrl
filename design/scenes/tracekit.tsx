// tracekit: one figure, three beats, white background.
// Claim: 17 recorded calls are really 7 endpoints with one login, and that is enough to generate a client:
//        7 spec operations, 7 SDK methods, 7 MCP tools.
// 1. The raw recording on its real time axis: 17 HAR entries, x = start time since the first entry, bar length = entry time,
//    small dark slabs = values redacted in that entry (sum 23).
//    examples/session.har (startedDateTime, time, method, url) and examples/generated/session.redacted.har (placeholders
//    counted per entry: 0,4,2,1,1,1,1,3,1,1,1,1,2,1,1,1,1 = 23 = tracekit.json redaction.total).
//    Entry 0 is GET / (the HTML page): not an API call, stays grey (stats.apiCalls = 16).
// 2. The 16 API calls fold back into their 7 endpoint rows (tracekit.json operations; mapping from the entry paths,
//    as in M/src/scenes/tracekit.tsx). Then the call graph: tracekit.json graph.edges, kind auth (6, all from login,
//    amber, left) and kind data (6, ids passed from listTodos/createTodo, blue, right). "order" edges are not drawn.
// 3. Proof: 7 operationIds in examples/generated/openapi.yaml, 7 async methods in examples/generated/sdk/client.ts,
//    7 tools in examples/generated/mcp-server/index.js CONFIG.tools; 73 tests pass and the MCP round trip is OK
//    (git show readme-redesign:README.md). Honest status: one local demo API recorded by script; the SDK is
//    generated but never compiled or called (README status table).
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Stage, Axes3D, AxisLabels, Bar, Tube, Target, Caption, Source, Name, Pin, C, usePhase, project, ease, span, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type V3 = [number, number, number];
// examples/session.har: start (ms since entry 0), time (ms), endpoint index (-1 = HTML page), redacted values
const E: { t: number; dur: number; op: number; sec: number }[] = [
  { t: 0, dur: 20.5, op: -1, sec: 0 },   // GET /
  { t: 36, dur: 15.4, op: 0, sec: 4 },   // POST /api/login
  { t: 68, dur: 1.1, op: 1, sec: 2 },    // GET /api/me
  { t: 84, dur: 0.9, op: 2, sec: 1 },    // GET /api/todos
  { t: 101, dur: 0.8, op: 3, sec: 1 },   // GET /api/todos/17
  { t: 116, dur: 0.7, op: 3, sec: 1 },   // GET /api/todos/42
  { t: 132, dur: 1.2, op: 4, sec: 1 },   // POST /api/todos
  { t: 149, dur: 1.0, op: 4, sec: 3 },   // POST /api/todos
  { t: 166, dur: 0.7, op: 3, sec: 1 },   // GET /api/todos/109
  { t: 182, dur: 1.1, op: 5, sec: 1 },   // PATCH /api/todos/42
  { t: 199, dur: 0.6, op: 5, sec: 1 },   // PATCH /api/todos/109
  { t: 215, dur: 0.5, op: 2, sec: 1 },   // GET /api/todos?done=true
  { t: 231, dur: 0.4, op: 2, sec: 2 },   // GET /api/todos?done=false
  { t: 247, dur: 0.5, op: 6, sec: 1 },   // DELETE /api/todos/110
  { t: 263, dur: 0.3, op: 6, sec: 1 },   // DELETE /api/todos/108
  { t: 278, dur: 0.6, op: 3, sec: 1 },   // GET /api/todos/108 (404)
  { t: 295, dur: 0.7, op: 2, sec: 1 },   // GET /api/todos
];
// tracekit.json operations: login, getMe, listTodos, getTodo, createTodo, updateTodo, deleteTodo
const HUE = [C.amber, C.teal, C.purple, C.sand, C.brown, C.rose, C.slate];
const AUTH: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]];
const DATA: [number, number][] = [[2, 3], [2, 5], [2, 6], [4, 3], [4, 5], [4, 6]];

const SX = 8, TMAX = 300;
const X = (ms: number) => (ms / TMAX) * SX;
const ROWZ = (j: number) => -(1.25 + j * 0.62);
const TL: Box = [SX, 0.001, 5.3];
const BEAD = 0.24;
const LEFT = -0.5, RIGHT = SX + 0.5;
const VER: Box = [2.4, 2.6, 1.0];
const VO: V3 = [SX + 2.2, 0, -2.2];

const camAt = (p: number): Cam => {
  // beat 1 close on the recording, beat 2 back to see the rows, beat 3 re-aimed to take in the proof
  const wide = span(p, 0.34, 0.93, 0.07), proof = span(p, 0.665, 0.95, 0.045);
  const az = -0.2 + 0.08 * Math.sin(TAU * p) + 0.1 * proof;
  const R = 11.8 + 3.0 * wide + 1.9 * proof, el = 0.5 + 0.12 * wide;
  const tx = 3.9 + 0.2 * wide + 1.45 * proof, tz = -0.7 - 1.3 * wide;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), R * Math.sin(el), tz + R * Math.cos(el) * Math.cos(az)], target: [tx, 0.1 + 0.25 * wide, tz], fov: 27 };
};

// an arc from A to B that rises by h and leans sideways by `lean` (x) so it reads from the front
const arcPts = (A: V3, B: V3, h: number, lean: number, n = 20, upto = 1): V3[] => {
  const m = Math.max(2, Math.round(n * upto));
  return Array.from({ length: m + 1 }, (_, i) => {
    const u = (i / n); const s = Math.sin(Math.PI * u);
    return [A[0] + (B[0] - A[0]) * u + lean * s, A[1] + (B[1] - A[1]) * u + h * s, A[2] + (B[2] - A[2]) * u] as V3;
  });
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const cam = camAt(p);
  const P = (q: V3) => project(q, cam, width, height);
  const reset = 1 - ease((p - 0.948) / 0.03);
  const b2 = span(p, 0.345, 0.955, 0.04), b3 = span(p, 0.675, 0.955, 0.04);
  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  const ax: Axis = { min: 0, max: TMAX, ticks: [0, 100, 200, 300], title: 'time (ms)' };
  const ay: Axis = { min: 0, max: 1, ticks: [], title: '' };
  const vy: Axis = { min: 0, max: 8, ticks: [0, 7], title: '' };
  const vx: Axis = { min: 0, max: 1, ticks: [], title: '' };

  const node = (j: number, side: number): V3 => [side, BEAD / 2, ROWZ(j)];
  const rails = ease((p - 0.36) / 0.05) * reset * b2;
  const authT = (i: number) => ease((p - 0.49 - i * 0.012) / 0.05) * reset * b2;
  const dataT = (i: number) => ease((p - 0.56 - i * 0.012) / 0.05) * reset * b2;

  const beads = E.map((e, i) => {
    const appear = ease((p - 0.03 - (e.t / TMAX) * 0.17) / 0.025) * reset;
    const fold = e.op < 0 ? 0 : ease((p - 0.37 - (e.t / TMAX) * 0.08) / 0.06);
    const L = Math.max(BEAD, X(e.dur));
    const x = X(e.t) + L / 2;
    const zT = e.op < 0 ? 0 : ROWZ(e.op);
    const h = e.op < 0 ? 0 : 0.55 + 0.1 * e.op;
    const s = Math.sin(Math.PI * fold);
    const pos: V3 = [x, BEAD / 2 + h * s, zT * fold];
    const col = e.op < 0 ? mix(C.quiet, '#FFFFFF', 0.45 * b2) : mix(C.quiet, HUE[e.op], ease((fold - 0.6) / 0.4));
    return { e, i, appear, fold, L, x, pos, col, h, zT };
  });
  const secOpacity = 1 - ease((p - 0.36) / 0.04);

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="tracekit" />
        <AxisLabels cam={cam} size={TL} x={ax} y={ay} />
        {c1 > 0.02 ? <div style={{ opacity: c1 }}>
          <Pin at={P([X(36) + 0.25, BEAD + 4 * 0.085 + 0.08, 0])} text="23 secrets redacted" color={C.ink} size={12} />
          <Pin at={P([X(0) + 0.35, 0, 0.3])} text="page, dropped" color={C.mute} size={10} dy={26} />
        </div> : null}
        {c2 > 0.02 ? <div style={{ opacity: c2 }}>
          <Pin at={P([LEFT - 0.73, BEAD / 2 + 1.67, ROWZ(3)])} text="token" color={C.amber} size={13} opacity={authT(5)} dy={-10} />
          <Pin at={P([RIGHT + 0.57, BEAD / 2 + 1.18, ROWZ(4)])} text="ids" color={C.blue} size={13} opacity={dataT(5)} dy={-10} />
          <Pin at={P([LEFT, 0, ROWZ(0)])} text="login" color={C.ink} size={11} dy={30} />
        </div> : null}
        {b3 > 0.02 ? <div style={{ opacity: b3 }}>
          <AxisLabels cam={cam} size={VER} origin={VO} x={vx} y={vy} />
          {['spec', 'SDK', 'MCP'].map((t, c) => <Pin key={t} at={P([VO[0] + (0.2 + c * 0.3) * VER[0], 0, VO[2] + 0.2])} text={t} color={C.ink} size={11} dy={20} />)}
          <Pin at={P([VO[0] + 0.5 * VER[0], VER[1] * 1.05, VO[2] - 0.5])} text="73 tests pass" color={C.green} size={14} dy={-8} />
        </div> : null}
        <Caption step={1} of={3} opacity={c1} text="One recording: 17 calls, secrets blacked out." />
        <Source opacity={c1} text="examples/session.har · 17 entries · 23 redacted" />
        <Caption step={2} of={3} opacity={c2} text="They fold into 7 endpoints; login feeds all." />
        <Source opacity={c2} text="tracekit.json · 7 operations · 6 auth + 6 data edges" />
        <Caption step={3} of={3} opacity={c3} text="Out come 7 operations, 7 methods, 7 tools." />
        <Source opacity={c3} text="1 local demo API, recorded by script · SDK not compiled" />
      </>}>
      <Axes3D size={TL} x={ax} y={ay} />
      {/* endpoint rails */}
      {rails > 0.02 ? HUE.map((h, j) => (
        <Tube key={'r' + j} points={[[LEFT, 0.02, ROWZ(j)], [LEFT + (RIGHT - LEFT) * rails, 0.02, ROWZ(j)]]} color={mix('#FFFFFF', h, 0.75)} radius={0.02} />
      )) : null}
      {rails > 0.02 ? HUE.map((h, j) => (
        <React.Fragment key={'n' + j}>
          <mesh position={node(j, LEFT)} scale={rails}><sphereGeometry args={[0.16, 20, 14]} /><meshLambertMaterial color={h} /></mesh>
          <mesh position={node(j, RIGHT)} scale={rails}><sphereGeometry args={[0.16, 20, 14]} /><meshLambertMaterial color={h} /></mesh>
        </React.Fragment>
      )) : null}
      {/* fold traces: each call's arc from the recording to its endpoint */}
      {beads.map((b) => {
        if (b.e.op < 0 || b.fold < 0.04 || b2 < 0.02) return null;
        const A: V3 = [b.x, BEAD / 2, 0], B: V3 = [b.x, BEAD / 2, b.zT];
        return <Tube key={'f' + b.i} points={arcPts(A, B, b.h, 0, 16, b.fold)} color={HUE[b.e.op]} radius={0.014} opacity={(0.6 - 0.3 * ease((b.fold - 0.9) / 0.1)) * reset} />;
      })}
      {/* the calls */}
      {beads.map((b) => b.appear > 0.01 ? (
        <mesh key={'b' + b.i} position={b.pos} scale={[b.L * Math.min(1, b.appear * 1.5), BEAD * b.appear, BEAD * Math.min(1, b.appear * 1.5)]}>
          <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={b.col} />
        </mesh>
      ) : null)}
      {/* redaction slabs: one per redacted value in that entry */}
      {secOpacity > 0.02 ? beads.map((b) => Array.from({ length: b.e.sec }, (_, k) => {
        const on = ease((b.appear - 0.5 - k * 0.1) / 0.3);
        if (on < 0.02) return null;
        return <mesh key={'s' + b.i + '-' + k} position={[b.x, BEAD + 0.06 + k * 0.085, 0]} scale={[0.2, 0.05 * on, 0.2]}>
          <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={C.ink} transparent opacity={secOpacity} />
        </mesh>;
      })) : null}
      {/* call graph: auth from login (left, amber), data ids (right, blue) */}
      {AUTH.map(([a, b], i) => {
        const t = authT(i); if (t < 0.04) return null;
        return <Tube key={'a' + i} points={arcPts(node(a, LEFT), node(b, LEFT), 0.35 + 0.22 * (b - a), -0.25 - 0.08 * (b - a), 22, t)} color={C.amber} radius={0.026} />;
      })}
      {DATA.map(([a, b], i) => {
        const t = dataT(i); if (t < 0.04) return null;
        return <Tube key={'d' + i} points={arcPts(node(a, RIGHT), node(b, RIGHT), 0.3 + 0.22 * Math.abs(b - a), 0.25 + 0.08 * Math.abs(b - a), 22, t)} color={C.blue} radius={0.026} />;
      })}
      {/* proof: three columns of 7 endpoint blocks against the target at 7 */}
      {b3 > 0.02 ? <>
        <Axes3D size={VER} origin={VO} x={vx} y={vy} />
        {[0, 1, 2].map((c) => HUE.map((h, j) => {
          const g = ease((p - 0.7 - c * 0.025 - j * 0.012) / 0.03) * reset;
          if (g < 0.02) return null;
          return <Bar key={'v' + c + j} size={VER} origin={VO} xFrac={0.2 + c * 0.3} zFrac={0.5} base={j / 8} hFrac={0.92 / 8 * g} w={0.17} d={0.45} color={h} />;
        }))}
        {ease((p - 0.82) / 0.04) > 0.02 ? <Target size={VER} origin={VO} yFrac={7 / 8} color={C.green} /> : null}
      </> : null}
    </Stage>
  );
};
export default Scene;
