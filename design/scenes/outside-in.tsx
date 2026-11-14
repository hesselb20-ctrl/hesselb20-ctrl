// outside-in: one figure, three beats, white background. A two-level link diagram.
// Claim: every finding in the report cites public evidence, and its confidence grade follows how much INDEPENDENT
//   evidence it has (distinct sources for an observation, distinct signal types for an inference), not the raw
//   number of citations. Checked in cli/src/synthesize.ts grade(): observed + >=2 sources -> high, observed + 1 ->
//   medium, inferred + >=2 signal types -> medium, inferred + 1 -> low; finalize() drops findings with no evidence.
// 1. Six collectors gather 45 evidence items (lower level, one hue per collector), each appearing at its real
//    observedAt time relative to the first request (report.json collection.requests: 19 GETs about 250 ms apart in
//    this demo run; cli/src/http.ts default is 1500 ms; /releases was skipped by robots.txt).
// 2. 13 findings form on the upper level; each pulls one link per cited evidence id (51 citations in total) and
//    stacks one block per citation (report.json findings[].evidence ids).
// 3. Findings re-sort by grade (8 high, 3 medium, 2 low). Blocks from the same source (or, for inferences, the same
//    signal type) merge, so the stack height becomes the independent count; every high stack stands at >= 2.
//    Inferred findings (classified from the claim text, matching the three inferred drafts in synthesize.ts) are drawn
//    translucent. Data: M/public/outside-in-report.json, extracted from examples/report/report.json (fictional demo
//    company served by a local demo site; heuristic synthesis).
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, Caption, Source, Name, Pin, C, SANS, usePhase, project, ease, span, mix, TAU, type Cam } from '../kit4';

type Ev = { id: string; sig: string; src: string; t: number };
type Fd = { conf: 'high' | 'medium' | 'low'; kind: 'observed' | 'inferred'; ids: string[]; keys: string[]; indep: number; short: string };
type D = { minDelayMs: number; requests: { t: number; outcome: string }[]; evidence: Ev[]; findings: Fd[] };
type V3 = [number, number, number];

const SIGS = ['tech', 'pricing', 'careers', 'changelog', 'dns', 'reviews'];
const HUE: Record<string, string> = { tech: C.blue, pricing: C.purple, careers: C.teal, changelog: C.brown, dns: C.rose, reviews: C.slate };
const GRADE: Record<string, string> = { high: C.green, medium: C.amber, low: C.coral };
const UY = 3.0;          // height of the upper (findings) level
const CUBE = 0.3;        // evidence block
const SW = 0.5;          // stack block width
const U = 0.27;          // stack block height (one citation)
const ZF = -0.42;        // depth of the finding stacks
const XL = -6.4, XR = 6.4, ZB = -1.2, ZFRONT = 0.32;

const camAt = (p: number): Cam => {
  const proof = span(p, 0.66, 0.955, 0.06);
  const az = -0.26 + 0.08 * Math.sin(TAU * p) + 0.07 * proof;
  const R = 17.4 - 0.4 * proof, el = 0.36 + 0.04 * proof;
  const ty = 2.25 + 0.05 * proof, tx = 0.25;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), ty + R * Math.sin(el), -0.45 + R * Math.cos(el) * Math.cos(az)], target: [tx, ty, -0.45], fov: 30 };
};

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
const Y = new THREE.Vector3(0, 1, 0);

const Block: React.FC<{ at: V3; s: V3; color: string; opacity?: number }> = ({ at, s, color, opacity = 1 }) =>
  s[1] < 0.002 || s[0] < 0.002 ? null : (
    <mesh geometry={box} position={at} scale={s}>
      <meshLambertMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </mesh>
  );

const Link: React.FC<{ a: V3; b: V3; t: number; color: string; opacity?: number; r?: number }> = ({ a, b, t, color, opacity = 1, r = 0.016 }) => {
  if (t < 0.01 || opacity < 0.01) return null;
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const E = A.clone().lerp(B, t); const dir = E.clone().sub(A); const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize());
  const mid = A.clone().add(E).multiplyScalar(0.5);
  return (
    <mesh geometry={cyl} position={mid} quaternion={q} scale={[r, len, r]}>
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </mesh>
  );
};

const Rim: React.FC<{ y: number; fill: number }> = ({ y, fill }) => {
  const g = useMemo(() => new THREE.BufferGeometry().setFromPoints([[XL, ZFRONT], [XR, ZFRONT], [XR, ZB], [XL, ZB], [XL, ZFRONT]].map(([x, z]) => new THREE.Vector3(x, 0, z))), []);
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(XL + XR) / 2, -0.002, (ZB + ZFRONT) / 2]}>
        <planeGeometry args={[XR - XL, ZFRONT - ZB]} />
        <meshBasicMaterial color={C.quiet} transparent opacity={fill} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <line geometry={g}><lineBasicMaterial color={C.axis} /></line>
    </group>
  );
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig(); const k = width / 960;
  const [d, setD] = React.useState<D | null>(null);
  const [h] = React.useState(() => delayRender('outside-in'));
  React.useEffect(() => { fetch(staticFile('outside-in-report.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(h); }); }, [h]);

  const L = useMemo(() => {
    if (!d) return null;
    // lower level: six groups, two rows deep, in collector order
    const pos = new Map<string, V3>(); const groupX: Record<string, number> = {}; const order = new Map<string, number>();
    const CX = 0.46, G = 0.78;
    const cols = SIGS.map((s) => Math.ceil(d.evidence.filter((e) => e.sig === s).length / 3));
    const total = cols.reduce((a, b) => a + b - 1, 0) * CX + (SIGS.length - 1) * G;
    let x = -total / 2;
    SIGS.forEach((s, gi) => {
      const items = d.evidence.filter((e) => e.sig === s);
      items.forEach((e, i) => { pos.set(e.id, [x + Math.floor(i / 3) * CX, CUBE / 2, -0.02 - (i % 3) * 0.42]); order.set(e.id, i); });
      groupX[s] = x + (cols[gi] - 1) * CX / 2;
      x += (cols[gi] - 1) * CX + G;
    });
    const T = Math.max(...d.evidence.map((e) => e.t));
    const sigOf = new Map(d.evidence.map((e) => [e.id, e.sig]));
    // upper level, beat 2: findings sit above the centroid of the evidence they cite (sorted, evenly spaced)
    const n = d.findings.length, SP = 0.84, GAP = 0.62;
    const cent = d.findings.map((f) => f.ids.reduce((a, id) => a + pos.get(id)![0], 0) / f.ids.length);
    const by2 = d.findings.map((_, i) => i).sort((a, b) => cent[a] - cent[b]);
    const x2 = new Array(n).fill(0); by2.forEach((fi, slot) => { x2[fi] = (slot - (n - 1) / 2) * SP; });
    // beat 3: grouped by grade (report order is already high -> medium -> low)
    const grades = ['high', 'medium', 'low'];
    const x3 = new Array(n).fill(0); const w3 = (n - 1) * SP + 2 * GAP; let gx = -w3 / 2, prev = '';
    const gCenter: Record<string, number[]> = { high: [], medium: [], low: [] };
    d.findings.forEach((f, i) => { if (prev && f.conf !== prev) gx += GAP; x3[i] = gx; gCenter[f.conf].push(gx); gx += SP; prev = f.conf; });
    // stacks: blocks ordered so that the first block of each independent key sits at the bottom; repeats on top
    const stacks = d.findings.map((f) => {
      const seen = new Set<string>(); const keep: number[] = [], dup: number[] = [];
      f.keys.forEach((key, j) => { if (seen.has(key)) dup.push(j); else { seen.add(key); keep.push(j); } });
      return [...keep.map((j) => ({ j, keep: true })), ...dup.map((j) => ({ j, keep: false }))];
    });
    const slot2 = new Array(n).fill(0); by2.forEach((fi, s) => { slot2[fi] = s; });
    return { pos, groupX, order, T, sigOf, x2, x3, slot2, stacks, gCenter, grades };
  }, [d]);

  if (!d || !L) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const P = (q: V3) => project(q, cam, width, height);
  const reset = 1 - ease((p - 0.955) / 0.04);
  const slide = ease((p - 0.68) / 0.07);        // findings move into grade groups
  const tint = ease((p - 0.72) / 0.05);         // stacks take the grade colour
  const merge = ease((p - 0.76) / 0.06);        // repeat-source blocks merge away
  const thr = ease((p - 0.82) / 0.04) * reset;  // the ">= 2 independent" line
  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  const popAt = (e: Ev) => 0.03 + (e.t / L.T) * 0.23 + L.order.get(e.id)! * 0.0035;

  const findX = (i: number) => L.x2[i] + (L.x3[i] - L.x2[i]) * slide;
  const startOf = (i: number) => 0.355 + L.slot2[i] * 0.018;
  const marks: React.ReactNode[] = [];
  const tops: V3[] = [];

  // evidence blocks
  d.evidence.forEach((e) => {
    const u = ease((p - popAt(e)) / 0.025) * reset;
    const [x, y, z] = L.pos.get(e.id)!;
    marks.push(<Block key={'e' + e.id} at={[x, y + (1 - u) * 0.5, z]} s={[CUBE * u, CUBE * u, CUBE * u]} color={HUE[e.sig]} />);
  });

  // findings: links and stacks
  d.findings.forEach((f, i) => {
    const fx = findX(i); const s0 = startOf(i);
    const inferred = f.kind === 'inferred';
    const op = 1 - (inferred ? 0.5 * tint : 0);
    const plateU = ease((p - s0) / 0.02) * reset;
    marks.push(<Block key={'pl' + i} at={[fx, UY + 0.015, ZF]} s={[SW + 0.16 * plateU, 0.03 * plateU, SW + 0.16 * plateU]} color={C.axis} />);
    let y = UY + 0.03;
    L.stacks[i].forEach(({ j, keep }, slot) => {
      const id = f.ids[j]; const sig = L.sigOf.get(id)!;
      const ls = s0 + 0.01 + slot * 0.006;
      const t = ease((p - ls) / 0.03);
      const arrived = ease((p - ls - 0.022) / 0.012) * reset;
      const hgt = U * arrived * (keep ? 1 : 1 - merge);
      const col = mix(HUE[sig], GRADE[f.conf], tint);
      const e = L.pos.get(id)!;
      const linkOp = reset * (keep ? 1 - 0.35 * tint : (1 - 0.35 * tint) * (1 - 0.8 * merge));
      marks.push(<Link key={'l' + i + '-' + j} a={[e[0], CUBE, e[2]]} b={[fx, UY, ZF]} t={t * (reset > 0.01 ? 1 : 0)} color={keep ? HUE[sig] : mix(HUE[sig], C.quiet, merge)} opacity={linkOp} />);
      if (hgt > 0.002) marks.push(<Block key={'s' + i + '-' + j} at={[fx, y + hgt / 2, ZF]} s={[SW, Math.max(0.002, hgt - 0.03), SW]} color={col} opacity={op} />);
      y += hgt;
    });
    tops[i] = [fx, y, ZF];
  });

  // count scale at the right of the upper level, and the >= 2 line in the proof
  const SX = XR + 0.25;
  const scaleOp = span(p, 0.4, 0.955, 0.05);
  const ticks = [0, 2, 4, 6];
  if (scaleOp > 0.01) {
    marks.push(<Link key="ax" a={[SX, UY, ZF]} b={[SX, UY + 6 * U + 0.05, ZF]} t={1} color={C.axis} opacity={scaleOp} r={0.01} />);
    ticks.forEach((v) => marks.push(<Link key={'tk' + v} a={[SX - 0.12, UY + 0.03 + v * U, ZF]} b={[SX + 0.04, UY + 0.03 + v * U, ZF]} t={1} color={C.axis} opacity={scaleOp} r={0.01} />));
  }
  if (thr > 0.01) marks.push(<group key="thr" position={[0, UY + 0.03 + 2 * U, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(XL + XR) / 2, 0, (ZB + ZFRONT) / 2]}><planeGeometry args={[XR - XL, ZFRONT - ZB]} /><meshBasicMaterial color={C.green} transparent opacity={0.13 * thr} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <Link a={[XL, 0, ZFRONT]} b={[XR, 0, ZFRONT]} t={thr} color={C.green} r={0.012} />
    <Link a={[XR, 0, ZFRONT]} b={[XR, 0, ZB]} t={thr} color={C.green} r={0.012} />
  </group>);

  const tick: React.CSSProperties = { position: 'absolute', transform: 'translate(-50%,-50%)', fontFamily: SANS, whiteSpace: 'nowrap' };
  const evAll = ease((p - 0.27) / 0.03) * reset;
  const web = d.findings.findIndex((f) => f.kind === 'observed' && f.conf === 'medium' && f.ids.length >= 5);
  const up = d.findings.findIndex((f) => f.kind === 'inferred' && f.conf === 'medium');
  const pinIn = ease((p - 0.8) / 0.03) * reset;
  const leftUpper = P([XL + 1.0, UY, ZFRONT]);
  const leftLower = P([XL - 0.25, 0.1, ZB]);
  const nCit = d.findings.reduce((a, f) => a + f.ids.length, 0);
  const uncited = d.findings.filter((f) => f.ids.length === 0).length;
  const cnt = (c: string) => d.findings.filter((f) => f.conf === c).length;

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="outside-in" />
        {SIGS.map((s) => { const q = P([L.groupX[s], 0, ZFRONT + 0.45]); return <div key={s} style={{ ...tick, left: q.x, top: q.y, fontSize: 11 * k, fontWeight: 600, color: mix(HUE[s], C.ink, 0.25) }}>{s}</div>; })}
        {L.grades.map((g) => { const xs = L.gCenter[g]; if (!xs.length || tint < 0.02) return null; const q = P([(xs[0] + xs[xs.length - 1]) / 2, UY + 6 * U + 0.3, ZF]); return <div key={g} style={{ ...tick, left: q.x, top: q.y, opacity: tint * reset, fontSize: 12 * k, fontWeight: 700, color: mix(GRADE[g], C.ink, 0.3) }}>{g} {cnt(g)}</div>; })}
        {scaleOp > 0.01 ? <>
          {ticks.map((v) => { const q = P([SX + 0.3, UY + 0.03 + v * U, ZF]); return <div key={'t' + v} style={{ ...tick, left: q.x, top: q.y, opacity: scaleOp, fontSize: 10.5 * k, color: C.mute }}>{v}</div>; })}
          {(() => { const q = P([SX + 0.2, UY + 6 * U + 0.42, ZF]); return <>
            <div style={{ ...tick, transform: 'translate(-20%,-50%)', left: q.x, top: q.y, opacity: scaleOp * (1 - tint), fontSize: 11.5 * k, fontWeight: 600, color: C.ink }}>citations</div>
            <div style={{ ...tick, transform: 'translate(-20%,-50%)', left: q.x, top: q.y, opacity: scaleOp * tint, fontSize: 11.5 * k, fontWeight: 600, color: C.ink }}>sources</div>
          </>; })()}
        </> : null}
        <Pin at={leftLower} text={`${d.evidence.length} items`} opacity={evAll} color={C.ink} size={13} dy={-2} />
        <Pin at={leftUpper} text={`${d.findings.length} findings · ${uncited} uncited`} opacity={ease((p - 0.6) / 0.03) * reset} color={C.ink} size={13} dy={24} />
        {web >= 0 ? <Pin at={P(tops[web])} text={`${d.findings[web].ids.length} cites, 1 page`} opacity={pinIn} color={mix(C.amber, C.ink, 0.45)} size={11} /> : null}
        {up >= 0 ? <Pin at={P(tops[up])} text="inferred" opacity={pinIn} color={mix(C.amber, C.ink, 0.45)} size={11} /> : null}
        <Caption step={1} of={3} opacity={c1} text="Six collectors gather public evidence." />
        <Source opacity={c1} text={`report.json · ${d.evidence.length} items · ${d.requests.length} GETs ${d.minDelayMs} ms apart · local demo`} />
        <Caption step={2} of={3} opacity={c2} text="Every finding links to the evidence it cites." />
        <Source opacity={c2} text={`report.json · ${d.findings.length} findings · ${nCit} citations · offline rules`} />
        <Caption step={3} of={3} opacity={c3} text="Grade follows independent sources, not citations." />
        <Source opacity={c3} text={`synthesize.ts grade() · fictional demo company`} />
      </>}>
      <Rim y={0} fill={0.18} />
      <Rim y={UY} fill={0.1 * reset + 0.04} />
      {marks}
    </Stage>
  );
};
export default Scene;
