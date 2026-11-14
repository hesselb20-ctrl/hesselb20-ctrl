// cea: one figure, three beats, white background.
// Claim: 8 test builds find the one optimisation pass, out of 270, that changes alias.c's output.
// All numbers are from ONE recorded triage (examples/05-ub-sanitizers-cannot-see/README.md, 2026-11-13, clang 23.1.5).
// 1. differential_run: "2 distinct behaviours across 13 builds"; -O0 prints 1073741824, -O2 prints 1 (README).
//    The 13 builds are clang + gcc at O0 O1 O2 O3 Os, plus three extra configs (reference -O0, bad -O2, -O2 with the
//    semantic probe -fwrapv -fno-strict-aliasing ...)  (src/tools/differential_run.ts defaults, src/tools/triage_miscompile.ts).
//    The README itemises only five of them: clang -O0 and extra -O0 (1073741824), clang -O2 and extra -O2 (1), and the
//    probe ("-O2 behaves like -O0"). The other eight are drawn grey: their output is not recorded per build.
//    Bar height = log10 of the printed value.
// 2. bisect_passes: "first flipping pass: instcombine on store_both (limit 19 of 270)". The halving loop is replayed
//    exactly as src/tools/bisect_passes.ts runs it: lo=0 (good), hi=270 (bad), mid=floor((lo+hi)/2), bad -> hi=mid
//    else lo=mid, until hi-lo = 1. With the recorded culprit 19 (single good-to-bad flip, the tool's own assumption) the
//    tested limits are 135 67 33 16 24 20 18 19 and the open range is 270 135 67 33 17 8 4 2 1 wide.
// 3. Proof: candidates left, log axis, 270 -> 1 in 8 builds; pin = pass 19 · instcombine.
//    The verdict of that run was suspected_undetected_ub, "compiler bug? unlikely" (README).
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, Axes3D, AxisLabels, Bar, Tube, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, TAU, type Cam, type Axis, type Box } from '../kit4';

const N = 270, CULPRIT = 19;
const TRAIL = (() => {
  let lo = 0, hi = N; const t: { mid: number; bad: boolean; lo: number; hi: number }[] = [];
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); const bad = mid >= CULPRIT; if (bad) hi = mid; else lo = mid; t.push({ mid, bad, lo, hi }); }
  return t;
})(); // 8 steps: 135 67 33 16 24 20 18 19
const ROWS = [{ lo: 0, hi: N }, ...TRAIL.map((s) => ({ lo: s.lo, hi: s.hi }))];
// one colour per build (not green / coral / amber: those mean good, flipped, highlight)
const BUILD_COL = [C.quiet, C.blue, C.teal, C.purple, C.slate, C.sand, C.brown, C.rose, C.sky];

// the 13 builds of differential_run; null = output not itemised in the README
const OUT: (number | null)[] = [1073741824, null, 1, null, null, null, null, null, null, null, 1073741824, 1, 1073741824];

const F: Box = [7.0, 2.1, 4.6];
const FO: [number, number, number] = [-3.0, 0, 2.3];
const BP: Box = [3.0, 2.3, 0.4];
const BO: [number, number, number] = [-7.6, 0, 1.6];

const camAt = (p: number): Cam => {
  // beat 1: close on the 13 builds; beat 2: the whole funnel; proof: swing left and closer, onto the narrow end
  const v1 = Math.min(1, 1 - ease((p - 0.255) / 0.08) + ease((p - 0.955) / 0.045));
  const pr = span(p, 0.66, 0.96, 0.05);
  const m = (base: number, b1: number, b3: number) => base + v1 * (b1 - base) + pr * (b3 - base);
  const az = m(-0.3, -0.18, -0.72) + 0.06 * Math.sin(TAU * p);
  const R = m(16.2, 8.6, 12.6), el = m(0.42, 0.3, 0.36);
  const tx = m(-1.6, -6.1, -2.5), tz = m(0, 1.4, 0.9), ty = m(0.85, 1.05, 0.85);
  return { position: [tx + R * Math.cos(el) * Math.sin(az), ty + 0.05 + R * Math.sin(el), tz + R * Math.cos(el) * Math.cos(az)], target: [tx, ty, tz], fov: 27 };
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const cam = camAt(p);
  const reset = 1 - ease((p - 0.942) / 0.03);

  const ax: Axis = { min: 0, max: N, ticks: [0, 90, 180, 270], title: 'pass limit' };
  const az: Axis = { min: 0, max: 8, ticks: [0, 4, 8], title: 'build', fmt: (v) => String(8 - v) };
  const ay: Axis = { min: 1, max: 300, ticks: [1, 10, 100], title: 'candidates', log: true };
  const by: Axis = { min: 1, max: 1e10, ticks: [1, 1e9], title: 'output', log: true, fmt: (v) => (v === 1 ? '1' : '10⁹') };
  const bx: Axis = { min: 0, max: 1, ticks: [], title: '13 builds' };

  const xw = (v: number) => FO[0] + (v / N) * F[0];
  const zf = (i: number) => 1 - i / 8; // build 0 (all 270) at the back, build 8 at the front
  const zw = (i: number) => FO[2] - zf(i) * F[2];
  const yh = (count: number) => Math.max(0.025, norm(ay, count)) * F[1];

  // the 270 pass limits as thin floor ticks in front of the funnel
  const ticks = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 1; k <= N; k++) { const x = FO[0] + (k / N) * F[0]; pts.push(new THREE.Vector3(x, 0, FO[2] + 0.12), new THREE.Vector3(x, 0, FO[2] + (k % 10 === 0 ? 0.36 : 0.26))); }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const t0 = 0.31, tStep = 0.036;
  const rowT = (i: number) => (i === 0 ? t0 : t0 + 0.02 + (i - 1) * tStep);
  const b3 = span(p, 0.67, 0.945, 0.03);
  const c1 = span(p, 0.015, 0.30), c2 = span(p, 0.32, 0.655), c3 = span(p, 0.675, 0.945);

  // stair profile of candidates left, drawn on the right wall
  const wallX = FO[0] - 0.4;
  const steps: [number, number, number][][] = [];
  ROWS.forEach((r, i) => {
    const y = yh(r.hi - r.lo);
    if (i > 0) steps.push([[wallX, yh(ROWS[i - 1].hi - ROWS[i - 1].lo), zw(i - 0.5)], [wallX, y, zw(i - 0.5)]]);
    steps.push([[wallX, y, zw(Math.max(0, i - 0.5))], [wallX, y, zw(Math.min(8, i + 0.5))]]);
  });
  const drawn = ease((p - 0.69) / 0.12) * reset;

  const P = (q: [number, number, number]) => project(q, cam, width, height);
  const b1pin = span(p, 0.08, 0.3, 0.03);
  const fA = span(p, 0.285, 0.955, 0.02); // the funnel's axes exist from beat 2 on
  const panel = Math.max(0.02, 1 - 0.98 * span(p, 0.68, 0.96, 0.02));
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="cea" />
        {fA > 0.05 ? <div style={{ opacity: fA }}><AxisLabels cam={cam} size={F} origin={FO} x={ax} y={ay} z={az} /></div> : null}
        {panel > 0.05 ? <div style={{ opacity: panel }}><AxisLabels cam={cam} size={BP} origin={BO} x={bx} y={by} /></div> : null}
        <Pin at={P([BO[0] + (2.2 / 13.8) * BP[0], norm(by, 1073741824) * BP[1], BO[2] - BP[2] / 2])} text="1073741824" color={C.green} size={17} opacity={b1pin} dy={-14} />
        <Pin at={P([BO[0] + (2.9 / 13.8) * BP[0], 0.05 * BP[1], BO[2] - BP[2] / 2])} text="1" color={C.coral} size={19} opacity={b1pin} />
        <Pin at={P([wallX - 0.45, yh(N) - 0.12, zw(0)])} text="270" color={C.ink} size={13} opacity={b3} />
        <Pin at={P([wallX, yh(1), zw(8)])} text="1" color={C.ink} size={13} opacity={ease((p - 0.8) / 0.03) * b3} />
        <Pin at={P([xw(CULPRIT) + 1.25, F[1] * 0.42, zw(8)])} text="pass 19 · instcombine" color={C.amber} size={14} opacity={ease((p - 0.74) / 0.04) * b3} />
        <Caption step={1} of={3} opacity={c1} text="13 builds, two different outputs." />
        <Source opacity={c1} text="examples/05 alias.c · clang 23.1.5 · 5 of 13 builds itemised" />
        <Caption step={2} of={3} opacity={c2} text="Each test build halves the suspect passes." />
        <Source opacity={c2} text="bisect_passes.ts halving loop · replay of the recorded result" />
        <Caption step={3} of={3} opacity={c3} text="8 builds: 270 passes down to one." />
        <Source opacity={c3} text="one recorded run, replayed · verdict: program UB, not a compiler bug" />
      </>}>
      {/* beat 1: the 13 builds of differential_run */}
      {panel > 0.05 ? <Axes3D size={BP} origin={BO} x={bx} y={by} /> : null}
      {panel > 0.05 && OUT.map((v, i) => {
        const grow = ease((p - 0.03 - i * 0.012) / 0.03) * reset;
        const known = v !== null;
        const h = known ? Math.max(0.03, norm(by, v!)) : 0.012;
        const col = !known ? C.quiet : v === 1 ? C.coral : C.green;
        return <Bar key={i} size={BP} origin={BO} xFrac={(i + 0.9) / 13.8} zFrac={0.5} hFrac={Math.max(0.004, h * grow)} w={0.05} d={0.7} color={col} opacity={panel} />;
      })}

      {/* beat 2: the funnel */}
      {fA > 0.05 ? <>
        <Axes3D size={F} origin={FO} x={ax} y={ay} z={az} />
        <lineSegments geometry={ticks}><lineBasicMaterial color={C.axis} transparent opacity={fA} /></lineSegments>
      </> : null}
      {ROWS.map((r, i) => {
        const T = rowT(i);
        const show = ease((p - T) / 0.02) * reset;
        if (show < 0.01) return null;
        const prev = i === 0 ? r : ROWS[i - 1];
        const u = ease((p - T - 0.014) / 0.02);
        const lo = prev.lo + (r.lo - prev.lo) * u, hi = prev.hi + (r.hi - prev.hi) * u;
        const cnt = hi - lo;
        const h = yh(Math.max(1, cnt)) * show;
        const s = TRAIL[i - 1];
        return <React.Fragment key={i}>
          <Bar size={F} origin={FO} xFrac={((lo + hi) / 2 + 0.5) / N} zFrac={zf(i)} hFrac={h / F[1]} w={Math.max(0.004, cnt / N)} d={0.075} color={BUILD_COL[i]} />
          {s ? <Bar size={F} origin={FO} xFrac={(s.mid + 0.5) / N} zFrac={zf(i) - 0.06} hFrac={(yh(Math.max(1, cnt)) + 0.28) / F[1] * show} w={0.006} d={0.012} color={s.bad ? C.coral : C.green} /> : null}
        </React.Fragment>;
      })}

      {/* beat 3: the proof */}
      {b3 > 0.02 ? <>
        <Tube points={[[xw(CULPRIT + 0.5), 0.01, FO[2] + 0.36], [xw(CULPRIT + 0.5), 0.01, zw(0) - 0.1]]} color={C.amber} radius={0.014} opacity={b3} />
        <Bar size={F} origin={FO} xFrac={(CULPRIT + 0.5) / N} zFrac={0} hFrac={0.58 * ease((p - 0.72) / 0.04) * reset} w={0.008} d={0.014} color={C.amber} />
        {steps.map((seg, j) => {
          const t = Math.max(0, Math.min(1, drawn * steps.length - j));
          if (t <= 0.03) return null;
          const a = seg[0], b = seg[1];
          return <Tube key={j} points={[a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]]} color={C.amber} radius={0.026} />;
        })}
      </> : null}
    </Stage>
  );
};
export default Scene;
