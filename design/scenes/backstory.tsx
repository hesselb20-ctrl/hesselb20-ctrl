// backstory: one figure, three beats, white background.
// Claim: hundreds of commits reduce to a few dozen sourced decision records, and each record says how sure it is.
// One example run on chalk/chalk, records written by a model.
// 1. The raw history: 381 commits, no reasons attached.         (examples/chalk/README.md: "381 commits produced 115 signals and 30 candidates")
//    The repo records no per-month commit dates, so commits are drawn as an undated carpet of 381 cubes (no time axis yet).
// 2. Signals -> candidates -> records.                          (README: 115 signals, 30 candidates, 2 skipped by the model, 28 records)
//    Each record becomes a column at its real date (index.json `date`), height = number of evidence items
//    (index.json `evidence`, 1..4), stacked bands = its signal kinds (index.json `signals`; kinds per cli/signals.ts:
//    dependency, config, refactor, revert, message, comment). Which carpet cubes survive each step is arbitrary (undated).
// 3. Confidence split.                                          (index.json `confidence`: 20 medium, 8 low, 0 high; `status`: 0010 reverted)
//    README: anonymous GitHub rate limit, only 2 PR descriptions read, so no record reached "high".
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, Axes3D, AxisLabels, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, mix, rng, TAU, type Cam, type Axis, type Box } from '../kit4';

// [id, date, confidence, status, signal kinds, evidence items] from examples/chalk/decisions/index.json
const R: [string, string, 'low' | 'medium', 'active' | 'reverted', string[], number][] = [
  ['0001', '2014-03-26', 'low', 'active', ['config', 'refactor'], 1],
  ['0002', '2014-06-14', 'low', 'active', ['dependency'], 1],
  ['0003', '2015-05-25', 'medium', 'active', ['dependency', 'config'], 1],
  ['0004', '2015-08-20', 'medium', 'active', ['dependency', 'config'], 1],
  ['0005', '2015-12-12', 'low', 'active', ['dependency'], 1],
  ['0006', '2017-05-21', 'medium', 'active', ['dependency', 'config'], 1],
  ['0007', '2017-06-20', 'medium', 'active', ['dependency', 'refactor', 'config'], 1],
  ['0008', '2017-07-23', 'medium', 'active', ['dependency', 'refactor'], 2],
  ['0009', '2017-10-17', 'medium', 'active', ['dependency', 'config'], 2],
  ['0010', '2018-02-14', 'low', 'reverted', ['revert'], 2],
  ['0011', '2018-09-18', 'medium', 'active', ['config', 'refactor'], 1],
  ['0012', '2018-12-26', 'low', 'active', ['dependency', 'config'], 1],
  ['0013', '2018-12-26', 'medium', 'active', ['dependency', 'refactor', 'config'], 2],
  ['0014', '2019-03-12', 'medium', 'active', ['refactor'], 2],
  ['0015', '2019-03-12', 'medium', 'active', ['config', 'refactor'], 1],
  ['0016', '2019-04-28', 'medium', 'active', ['dependency', 'refactor', 'config'], 2],
  ['0017', '2019-07-12', 'medium', 'active', ['dependency', 'message'], 2],
  ['0018', '2019-07-12', 'low', 'active', ['dependency', 'config', 'refactor'], 1],
  ['0019', '2020-04-02', 'medium', 'active', ['config', 'refactor'], 1],
  ['0020', '2021-04-16', 'medium', 'active', ['dependency', 'config', 'refactor'], 1],
  ['0021', '2021-07-30', 'medium', 'active', ['dependency', 'config'], 2],
  ['0022', '2021-11-10', 'medium', 'active', ['refactor'], 2],
  ['0023', '2021-11-26', 'medium', 'active', ['dependency'], 1],
  ['0024', '2022-03-09', 'medium', 'active', ['config', 'message'], 1],
  ['0025', '2022-10-12', 'medium', 'active', ['comment'], 4],
  ['0026', '2026-03-29', 'low', 'active', ['dependency', 'config'], 1],
  ['0027', '2026-07-25', 'medium', 'active', ['dependency', 'config', 'refactor'], 1],
  ['0028', '2026-09-25', 'low', 'active', ['dependency', 'refactor', 'config'], 1],
];
const N_COMMITS = 381, N_SIGNALS = 115, N_CAND = 30; // examples/chalk/README.md
const KIND: Record<string, string> = { dependency: C.blue, config: C.teal, refactor: C.purple, revert: C.coral, message: C.sand, comment: C.rose };

const BOX: Box = [12, 2.2, 4.4];
const O: [number, number, number] = [-6, 0, 2.2];
const GX = 32, GZ = 12; // carpet grid, 384 cells, 381 used
const W = 0.2, D = 0.2; // record column footprint (world units)

const yearOf = (s: string) => { const [y, m, d] = s.split('-').map(Number); return y + ((m - 1) * 30.4 + d) / 365; };
const ROWZ: Record<string, number> = { low: 0.2, medium: 0.5, high: 0.8 };

const camAt = (p: number): Cam => {
  const proof = span(p, 0.67, 0.925, 0.065);
  const az = -0.2 + 0.06 * Math.sin(TAU * p) + 0.08 * proof;
  const el = 0.44 + 0.22 * proof;
  const R0 = 17.6 + 0.9 * proof;
  const t: [number, number, number] = [0.5 + 0.1 * proof, 0.45 - 0.25 * proof, -0.3];
  return { position: [t[0] + R0 * Math.cos(el) * Math.sin(az), t[1] + R0 * Math.sin(el), t[2] + R0 * Math.cos(el) * Math.cos(az)], target: t, fov: 27 };
};

// greedy lanes so columns that share a date window do not overlap
const lanes = (idx: number[]) => {
  const out: Record<number, number> = {}; const last = [-99, -99, -99];
  idx.slice().sort((a, b) => yearOf(R[a][1]) - yearOf(R[b][1])).forEach((i) => {
    const x = norm(XA, yearOf(R[i][1])) * BOX[0];
    let l = last.findIndex((lx) => x - lx > W * 1.15); if (l < 0) l = 0;
    out[i] = l; last[l] = x;
  });
  return out;
};
const XA: Axis = { min: 2013.6, max: 2027.0, ticks: [2014, 2016, 2018, 2020, 2022, 2024, 2026], title: 'year' };
const LANE = [0, 0.075, -0.075];

const Box1: React.FC<{ pos: [number, number, number]; s: [number, number, number]; color: string; opacity?: number }> = ({ pos, s, color, opacity = 1 }) => {
  const g = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  if (s[1] < 0.0005 || opacity < 0.01) return null;
  return <mesh geometry={g} position={pos} scale={s}><meshLambertMaterial color={color} transparent={opacity < 1} opacity={opacity} /></mesh>;
};

const Lane: React.FC<{ zf: number; color: string; fill: number; rim: number }> = ({ zf, color, fill, rim }) => {
  const [sx, , sz] = BOX; const z = O[2] - zf * sz; const dz = 0.13 * sz;
  const g = useMemo(() => new THREE.BufferGeometry().setFromPoints([[0, -dz], [sx, -dz], [sx, dz], [0, dz], [0, -dz]].map(([a, b]) => new THREE.Vector3(O[0] + a, 0.004, z + b))), [z]);
  return <group>
    {fill > 0.005 ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[O[0] + sx / 2, 0.002, z]}><planeGeometry args={[sx, 2 * dz]} /><meshBasicMaterial color={color} transparent opacity={fill} depthWrite={false} /></mesh> : null}
    {rim > 0.01 ? <line geometry={g}><lineBasicMaterial color={color} transparent opacity={rim} /></line> : null}
  </group>;
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const cam = camAt(p);
  const [sx, sy, sz] = BOX;
  const reset = 1 - ease((p - 0.955) / 0.04);

  // carpet: shuffled order; perm[0..27] become records, [0..29] candidates, [0..114] signals
  const perm = useMemo(() => { const r = rng(7); const a = Array.from({ length: N_COMMITS }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }, []);
  const rank = useMemo(() => { const k = new Array(N_COMMITS); perm.forEach((c, i) => (k[c] = i)); return k as number[]; }, [perm]);
  const cell = (c: number): [number, number] => [((c % GX) + 0.5) / GX, (Math.floor(c / GX) + 0.5) / GZ];
  const laneAll = useMemo(() => lanes(R.map((_, i) => i)), []);
  const laneRow = useMemo(() => { const o: Record<number, number> = {}; (['low', 'medium'] as const).forEach((c) => Object.assign(o, lanes(R.map((_, i) => i).filter((i) => R[i][2] === c)))); return o; }, []);

  // timing
  const tSig = ease((p - 0.35) / 0.04), tCand = ease((p - 0.40) / 0.04), tSkip = ease((p - 0.445) / 0.02);
  const tFly = (i: number) => ease((p - 0.46 - (i / 28) * 0.05) / 0.04);
  const tRow = ease((p - 0.68) / 0.07);
  const carpetGone = ease((p - 0.56) / 0.06);
  const yrs = span(p, 0.47, 0.955, 0.035), conf = span(p, 0.69, 0.955, 0.04);
  const UNIT = sy / 4.4; // one evidence item

  const ax0: Axis = { min: 0, max: 1, ticks: [], title: '' };
  const ay: Axis = { min: 0, max: 4.4, ticks: [1, 2, 3, 4], title: 'evidence' };
  const az: Axis = { min: 0, max: 1, ticks: [0.2, 0.5, 0.8], title: 'confidence', fmt: (v) => (v < 0.3 ? 'low' : v < 0.6 ? 'medium' : 'high') };

  const colTop = (i: number) => {
    const [, date, c, , , ev] = R[i];
    const x = O[0] + norm(XA, yearOf(date)) * sx;
    const zf = (0.5 + LANE[laneAll[i]]) * (1 - tRow) + (ROWZ[c] + LANE[laneRow[i]]) * tRow;
    return { x, z: O[2] - zf * sz, h: ev * UNIT };
  };
  const P = (q: [number, number, number]) => project(q, cam, width, height);
  const mid = P([O[0] + sx * 0.5, 0.25, O[2] - sz * 0.5]);

  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  const pinAt = (id: string, extra = 0) => { const i = R.findIndex((r) => r[0] === id); const t = colTop(i); return P([t.x, t.h + extra, t.z]); };
  const foot = (id: string) => { const t = colTop(R.findIndex((r) => r[0] === id)); return P([t.x, 0, t.z + 0.3]); };
  const lane = (c: string) => P([O[0] + sx + 0.8, 0, O[2] - ROWZ[c] * sz]);

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="backstory" />
        <div style={{ opacity: yrs }}><AxisLabels cam={cam} size={BOX} origin={O} x={XA} y={ay} /></div>
                {/* beat 1-2 funnel counts, one at a time over the carpet */}
        <Pin at={mid} text={`${N_COMMITS} commits`} color={C.mute} size={17} opacity={span(p, 0.07, 0.34, 0.03)} dy={-40} />
        <Pin at={mid} text={`${N_SIGNALS} signals`} color={C.blue} size={17} opacity={span(p, 0.36, 0.405, 0.012)} dy={-40} />
        <Pin at={mid} text={`${N_CAND} candidates`} color={C.amber} size={17} opacity={span(p, 0.415, 0.465, 0.012)} dy={-40} />
        {/* beat 2: name a few signal kinds on columns that carry only that kind */}
        {(() => { const o = span(p, 0.555, 0.665, 0.02); return o > 0.01 ? <>
          <Pin at={pinAt('0002')} text="dependency" color={C.blue} opacity={o} />
          <Pin at={pinAt('0010')} text="revert" color={C.coral} opacity={o} />
          <Pin at={pinAt('0022')} text="refactor" color={C.purple} opacity={o} dy={-10} />
          <Pin at={pinAt('0025')} text="comment" color={C.rose} opacity={o} />
        </> : null; })()}
        {/* beat 3: the counts per confidence row, the empty high row, the revert */}
        {conf > 0.01 ? <>
          <Pin at={lane('high')} text="0 high" color={C.amber} size={15} opacity={conf} dy={8} />
          <Pin at={lane('medium')} text="20 medium" color={C.ink} size={15} opacity={conf} dy={8} />
          <Pin at={lane('low')} text="8 low" color={C.ink} size={15} opacity={conf} dy={8} />
          <Pin at={foot('0010')} text="reverted" color={C.coral} size={12.5} opacity={conf} dy={22} />
        </> : null}
        <Caption step={1} of={3} opacity={c1} text="381 commits. The reasons are buried." />
        <Source opacity={c1} text="examples/chalk · 381 commits scanned · undated here" />
        <Caption step={2} of={3} opacity={c2} text="Signals narrow to 28 sourced decisions." />
        <Source opacity={c2} text="115 signals → 30 candidates → 28 records" />
        <Caption step={3} of={3} opacity={c3} text="Every record says how sure it is." />
        <Source opacity={c3} text="one run on chalk · model-written · 2 PRs read (rate limit)" />
      </>}>
      <Axes3D size={BOX} origin={O} x={XA} y={ay} z={az} />
      {/* confidence lanes; the high lane stays empty, rimmed in amber */}
      {conf > 0.01 ? <>
        <Lane zf={ROWZ.low} color={C.slate} fill={0.07 * conf} rim={0.35 * conf} />
        <Lane zf={ROWZ.medium} color={C.slate} fill={0.07 * conf} rim={0.35 * conf} />
        <Lane zf={ROWZ.high} color={C.amber} fill={0.1 * conf} rim={0.9 * conf} />
      </> : null}
      {/* the carpet of commits */}
      {Array.from({ length: N_COMMITS }, (_, c) => {
        const k = rank[c];
        if (k < 28 && p > 0.46) return null; // these fly off as records
        const [xf, zf] = cell(c);
        const appear = ease((p - 0.02 - (c / N_COMMITS) * 0.2) / 0.04) * reset;
        const isSig = k < N_SIGNALS, isCand = k < N_CAND, skipped = k >= 28 && k < N_CAND;
        let h = 0.12, col = C.quiet, op = 1;
        if (!isSig) { h = 0.12 * (1 - tSig) + 0.006 * tSig; col = mix(C.quiet, '#EEF0F3', tSig); }
        else if (!isCand) { h = 0.12 + 0.1 * tSig - 0.214 * tCand; col = mix(mix(C.quiet, C.blue, tSig), '#EEF0F3', tCand); }
        else { h = 0.12 + 0.1 * tSig + 0.18 * tCand - (skipped ? 0.394 * tSkip : 0); col = mix(mix(C.quiet, C.blue, tSig), C.amber, tCand); if (skipped) col = mix(col, '#EEF0F3', tSkip); }
        h = Math.max(0.006, h) * appear; op = 1 - carpetGone;
        return <Box1 key={c} pos={[O[0] + xf * sx, h / 2, O[2] - zf * sz]} s={[sx / GX * 0.7, h, sz / GZ * 0.7]} color={col} opacity={op} />;
      })}
      {/* the 28 records: fly from their carpet cube to their date, grow to their evidence count, colour by signal kind */}
      {p > 0.46 ? R.map((r, i) => {
        const f = tFly(i) * reset; const [xf, zf] = cell(perm[i]);
        const from = [O[0] + xf * sx, O[2] - zf * sz]; const t = colTop(i);
        const x = from[0] + (t.x - from[0]) * f, z = from[1] + (t.z - from[1]) * f;
        const lift = Math.sin(Math.PI * f) * 0.5;
        const H = (0.37 * (1 - f) + t.h * f) * reset;
        const w = (sx / GX * 0.7) * (1 - f) + W * f, d = (sz / GZ * 0.7) * (1 - f) + D * f;
        const kinds = r[4]; const bh = H / kinds.length;
        return <group key={r[0]}>{kinds.map((k, j) => <Box1 key={k} pos={[x, lift + bh * (j + 0.5), z]} s={[w, bh * 0.985, d]} color={mix(C.amber, KIND[k], f)} />)}</group>;
      }) : null}
    </Stage>
  );
};
export default Scene;
