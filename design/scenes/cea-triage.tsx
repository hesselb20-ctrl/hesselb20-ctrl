// cea-triage: one figure, three beats, white background.
// Claim: every check cea runs leaves one stored evidence record, and a case stops as soon as its question is answered:
//        example 1 stops after 2 steps (UB), example 5 needs all 9; five recorded cases, 16 records, five verdicts.
// Rungs (front to back) = the triage chain in the order src/tools/triage_miscompile.ts runs it:
//   environment, check_ub, differential_run, bisect_passes, reduce_testcase, pass_timeline, IR before (compile),
//   IR after (compile), validate_transform (Alive2); then, after a gap, two tools OUTSIDE the chain that example 2 used:
//   opt_remarks, benchmark. Rung colour = the tool's `family` field in src/tools/*.ts:
//   environment = slate, correctness = teal, compile = purple, performance = sand.
// One tile = one evidence record. invokeTool (src/core/context.ts) appends exactly one record per tool call
//   (ledger.append in EvidenceBuilder.finish). triage_miscompile also writes one wrapper record of its own that derives
//   from its steps; those 2 wrappers (ex 1, ex 5) are not drawn, so the count is per check: 2+2+2+1+9 = 16.
// The five recorded runs (examples/*/README.md, recorded 2026-11-13, clang 23.1.5 llvm-mingw, by the author):
//   01 overflow.c  cea triage: [1] environment [2] check_ub -> verdict undefined_behavior, stops (2 records)
//   02 scale.c     opt_remarks (ev_opt_remarks_1127722c) + benchmark (ev_benchmark_7912f965): restrict 3.55x faster
//                  by median -> a missed vectorisation, not a wrong-code bug. Not a triage run: lane starts off-chain.
//   03 wrong.ll    validate_transform twice (ev_..._3c4353db INCORRECT, ev_..._d0a1fb1d correct with nsw). The rewrite was
//                  written for the example, not taken from LLVM. Not a triage run: lane starts at the Alive2 rung.
//   04 crash.c     reduce_testcase (ev_reduce_testcase_476545d0): crash reduced 88 -> 2 lines. The crash is clang's own
//                  deliberate debug hook. Not a triage run: lane starts at the reduce rung.
//   05 alias.c     cea triage, full chain: README lists steps [2]..[6] and [9]; [1] environment and [7] [8] (IR before /
//                  after the culprit) must have run for [9] to exist (triage_miscompile.ts) -> 9 records;
//                  verdict suspected_undetected_ub (strict aliasing), "compiler bug? unlikely".
// Beats: 1. five recorded cases at the foot of the chain. 2. each climbs only the rungs it ran, one tile per record.
//        3. where each ended: 2 x the program's UB (rose), 1 missed optimisation (sand), 1 refuted rewrite (coral),
//           1 reduced crash (brown); 16 records pinned.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { SANS, mix, Stage, Axes3D, AxisLabels, Bar, Tube, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, TAU, type Cam, type Axis, type Box } from '../kit4';

const RUNGS = [
  { name: 'env', fam: C.slate, x: 0 },
  { name: 'UB', fam: C.teal, x: 1 },
  { name: 'diff', fam: C.teal, x: 2 },
  { name: 'bisect', fam: C.teal, x: 3 },
  { name: 'reduce', fam: C.teal, x: 4 },
  { name: 'timeline', fam: C.purple, x: 5 },
  { name: 'IR before', fam: C.purple, x: 6 },
  { name: 'IR after', fam: C.purple, x: 7 },
  { name: 'Alive2', fam: C.teal, x: 8 },
  { name: 'remarks', fam: C.purple, x: 9.7 },
  { name: 'bench', fam: C.sand, x: 10.7 },
];
type Run = { id: string; rungs: number[]; verdict: string; col: string; triage?: boolean; below?: boolean };
const RUNS: Run[] = [
  { id: '01', rungs: [0, 1], verdict: 'UB', col: C.rose, triage: true },
  { id: '02', rungs: [9, 10], verdict: '3.55× missed', col: C.sand },
  { id: '03', rungs: [8, 8], verdict: 'refuted', col: C.coral },
  { id: '04', rungs: [4], verdict: 'crash 88→2', col: C.brown, below: true },
  { id: '05', rungs: [0, 1, 2, 3, 4, 5, 6, 7, 8], verdict: 'aliasing UB', col: C.rose, triage: true },
];
const TOTAL = RUNS.reduce((s, r) => s + r.rungs.length, 0); // 16

// rungs run left to right along x, the five cases sit in depth (01 in front, 05 at the back), records go up
const F: Box = [8.6, 2.5, 3.6];
const FO: [number, number, number] = [-4.3, 0, 1.8];
const ax: Axis = { min: -0.6, max: 11.7, ticks: RUNGS.map((r) => r.x), title: '', fmt: (v) => RUNGS.find((r) => r.x === v)?.name ?? '' };
const ay: Axis = { min: 0, max: 9.6, ticks: [3, 6, 9], title: 'records' };
const az: Axis = { min: -0.5, max: 4.5, ticks: [], title: '' };

const camAt = (p: number): Cam => {
  const pr = span(p, 0.66, 0.96, 0.06);
  const a = -0.36 + 0.06 * Math.sin(TAU * p) + 0.1 * pr;
  const R = 26.5 - 1.2 * pr, el = 0.66 + 0.04 * pr;
  const tx = -0.35 + 0.3 * pr, ty = 0.45 + 0.1 * pr, tz = -0.3;
  return { position: [tx + R * Math.cos(el) * Math.sin(a), ty + R * Math.sin(el), tz + R * Math.cos(el) * Math.cos(a)], target: [tx, ty, tz], fov: 21 };
};

const xw = (rx: number) => FO[0] + norm(ax, rx) * F[0];
const zw = (lane: number) => FO[2] - norm(az, lane) * F[2];
const yw = (lvl: number) => norm(ay, lvl) * F[1];
type V = [number, number, number];

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const cam = camAt(p);
  const P = (q: V) => project(q, cam, width, height);
  const reset = 1 - ease((p - 0.955) / 0.04);

  // beat 2 clock: a sweep from the first rung to the last
  const s = Math.max(0, (p - 0.335) / 0.29) * 11.8;
  const sweepAt = (rx: number) => ease((s - rx - 0.1) / 0.5);
  const b3 = span(p, 0.675, 0.955, 0.03);
  const c1 = span(p, 0.015, 0.31), c2 = span(p, 0.325, 0.655), c3 = span(p, 0.675, 0.955);
  const tileH = 0.7;
  const fA = span(p, 0.0, 0.955, 0.02) || 1;

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="cea" />
        <div style={{ opacity: fA }}><AxisLabels cam={cam} size={F} origin={FO} x={ax} y={ay} z={az} /></div>
        {RUNS.map((r, i) => {
          const q = P([FO[0] - 0.85, 0.05, zw(i)]);
          return <div key={'id' + i} style={{ position: 'absolute', left: q.x, top: q.y, transform: 'translate(-50%,-50%)', fontFamily: SANS, fontSize: 11.5 * (width / 960), fontWeight: 600, color: C.mute, opacity: ease((p - 0.08 - i * 0.03) / 0.04) * (1 - ease((p - 0.955) / 0.04)) }}>{r.id}</div>;
        })}
        {RUNS.map((r, i) => {
          const last = r.rungs[r.rungs.length - 1];
          const at = r.below ? P([xw(RUNGS[last].x) + 0.35, 0, zw(i) + 0.15]) : P([xw(RUNGS[last].x), yw(r.rungs.length) + 0.62, zw(i)]);
          return <div key={'v' + i} style={{ position: 'absolute', left: at.x, top: at.y + (r.below ? 4 : -6) * (width / 960), transform: r.below ? 'translate(-20%,0)' : 'translate(-50%,-100%)', fontFamily: SANS, fontWeight: 700, fontSize: 14 * (width / 960), color: mix(r.col, C.ink, 0.25), whiteSpace: 'nowrap', textShadow: '0 0 3px #fff, 0 0 3px #fff, 0 0 4px #fff', opacity: b3 * ease((p - 0.72 - i * 0.02) / 0.03) }}>{r.verdict}</div>;
        })}
        <Caption step={1} of={3} opacity={c1} text="Five cases. A full triage is nine checks." />
        <Source opacity={c1} text="examples/01-05 · recorded 2026-11-13 · clang 23.1.5" />
        <Caption step={2} of={3} opacity={c2} text="Each check run leaves one evidence record." />
        <Source opacity={c2} text="1 tile = 1 ledger record · triage order" />
        <Caption step={3} of={3} opacity={c3} text={`${TOTAL} records, five verdicts: two were UB.`} />
        <Source opacity={c3} text="five runs recorded by the author, not re-run here" />
      </>}>
      <Axes3D size={F} origin={FO} x={ax} y={ay} z={az} />

      {/* the rungs: thin floor lines through all five lanes, coloured by tool family */}
      {RUNGS.map((r, k) => {
        const g = ease((p - 0.04 - k * 0.016) / 0.04) * reset;
        if (g < 0.01) return null;
        return <Bar key={'r' + k} size={F} origin={FO} xFrac={norm(ax, r.x)} zFrac={0.5} hFrac={0.004} w={0.012} d={0.98 * g} color={r.fam} />;
      })}

      {RUNS.map((r, i) => {
        // entry token at the start of the lane
        const drop = ease((p - 0.1 - i * 0.03) / 0.05) * reset;
        const entryX = FO[0] - 0.25;
        const tok = <Bar key={'t' + i} size={F} origin={FO} xFrac={-0.045} zFrac={norm(az, i)} base={0.4 * (1 - drop)} hFrac={0.07} w={0.04} d={0.1} color={b3 > 0.5 ? r.col : C.blue} opacity={Math.max(0.02, drop)} />;
        const tiles: React.ReactNode[] = [];
        const segs: React.ReactNode[] = [];
        const col = b3 > 0.02 ? r.col : C.blue;
        let prev: V = [entryX, 0.06, zw(i)];
        r.rungs.forEach((rk, k) => {
          const R = RUNGS[rk];
          const t = sweepAt(R.x + (k > 0 && r.rungs[k - 1] === rk ? 0.6 : 0)) * reset;
          const lvl = k + 1;
          const yTop = yw(lvl), yBot = yw(lvl - tileH);
          const here: V = [xw(R.x), yTop + 0.015, zw(i)];
          if (t > 0.01) {
            const fall = (1 - t) * 1.0;
            tiles.push(<Bar key={'k' + k} size={F} origin={FO} xFrac={norm(ax, R.x)} zFrac={norm(az, i)} base={(yBot + fall) / F[1]} hFrac={(yTop - yBot) / F[1]} w={0.05} d={0.13} color={R.fam} opacity={Math.min(1, t * 1.6)} />);
            if (yBot > 0.01) tiles.push(<Bar key={'p' + k} size={F} origin={FO} xFrac={norm(ax, R.x)} zFrac={norm(az, i)} hFrac={Math.max(0.001, (yBot / F[1]) * t)} w={0.005} d={0.012} color={C.quiet} />);
            // the climb: along the lane to this rung, then up onto the new tile
            const u = Math.min(1, t * 1.3);
            const a = prev, corner: V = [here[0], a[1], a[2]];
            const h1 = Math.min(1, u * 2), h2 = Math.max(0, u * 2 - 1);
            if (k > 0 && Math.abs(corner[0] - a[0]) > 0.02) segs.push(<Tube key={'s1' + k} points={[a, [a[0] + (corner[0] - a[0]) * h1, a[1], a[2]]]} color={col} radius={0.028} opacity={k === 0 ? 0.45 : 1} />);
            if (k > 0 && h2 > 0.02 && here[1] - corner[1] > 0.02) segs.push(<Tube key={'s2' + k} points={[corner, [here[0], corner[1] + (here[1] - corner[1]) * h2, here[2]]]} color={col} radius={0.028} opacity={k === 0 ? 0.45 : 1} />);
          }
          prev = here;
        });
        // ghost staircase: the full triage chain (9 checks) for the two triage runs; skipped checks fade out
        const ghosts = r.triage ? RUNGS.slice(0, 9).map((R, k) => {
          const appear = ease((p - 0.12 - k * 0.012) / 0.04) * reset;
          const skipped = k >= r.rungs.length;
          const gone = skipped ? ease((s - r.rungs.length - 0.4) / 0.8) : sweepAt(R.x);
          const o = appear * (1 - gone);
          if (o < 0.02) return null;
          return <Bar key={'g' + k} size={F} origin={FO} xFrac={norm(ax, R.x)} zFrac={norm(az, i)} base={yw(k + 1 - tileH) / F[1]} hFrac={(yw(k + 1) - yw(k + 1 - tileH)) / F[1]} w={0.05} d={0.13} color={C.quiet} opacity={0.55 * o} />;
        }) : null;
        // verdict flag on the last tile
        const last = r.rungs[r.rungs.length - 1];
        const fy = yw(r.rungs.length);
        const flag = b3 * ease((p - 0.7 - i * 0.02) / 0.04);
        return <React.Fragment key={'run' + i}>
          {tok}{ghosts}{tiles}{segs}
          {flag > 0.02 ? <>
            <Bar size={F} origin={FO} xFrac={norm(ax, RUNGS[last].x)} zFrac={norm(az, i)} base={fy / F[1]} hFrac={(0.36 * flag) / F[1]} w={0.004} d={0.012} color={C.ink} />
            <Bar size={F} origin={FO} xFrac={norm(ax, RUNGS[last].x)} zFrac={norm(az, i)} base={(fy + 0.36 * flag) / F[1]} hFrac={0.14 / F[1]} w={0.03} d={0.08} color={r.col} />
          </> : null}
        </React.Fragment>;
      })}
    </Stage>
  );
};
export default Scene;
