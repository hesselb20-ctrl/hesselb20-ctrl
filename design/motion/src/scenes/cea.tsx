// cea: the recorded triage of examples/05-ub-sanitizers-cannot-see, replayed as a 3D sequence.
// Every number comes from that example's README (the author's recorded run, clang 23.1.5, 2026-11-13):
// 9 chained steps (numbered [1]..[9] in the output), bisect_passes "limit 19 of 270",
// reduce_testcase "18 -> 10 lines", validate_transform "??" (no Alive2 verdict).
// The bisection trail is the halving src/tools/bisect_passes.ts performs (lo=0, hi=270) to land on 19.
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

const CAM: Cam = { position: [3.2, 6.2, 12.5], target: [0.2, 0.7, 0.2], fov: 34 };

const STEPS = 9; // [1] environment .. [9] validate_transform
const OPEN = 8; // validate_transform: "??", Alive2 gave no verdict
const BISECT = 3, REDUCE = 4;
const TOTAL_PASSES = 270, CULPRIT = 19;
const LINES_FROM = 18, LINES_TO = 10;
const DX = 1.2;
const xOf = (i: number) => (i - 4.5) * DX;

// lo/hi after each probe of the real loop: while (hi - lo > 1) { mid = floor((lo+hi)/2); bad ? hi = mid : lo = mid }
const TRAIL: [number, number][] = (() => {
  let lo = 0, hi = TOTAL_PASSES;
  const out: [number, number][] = [[lo, hi]];
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid >= CULPRIT) hi = mid; else lo = mid;
    out.push([lo, hi]);
  }
  return out;
})();

const T0 = 0.03, W = 0.09; // step i runs over [T0 + i W, T0 + (i+1) W)
const REC = T0 + STEPS * W + 0.02; // the triage record itself
const FADE0 = 0.93; // everything resets over [0.93, 1) so frame 96 meets frame 0
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => v * v * (3 - 2 * v);

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const reset = ease(clamp((phase - FADE0) / (1 - FADE0))); // 0 while running, 1 at loop end
  const live = 1 - reset;
  const stepAt = (i: number) => clamp((phase - (T0 + i * W)) / W); // 0 before, 0..1 during, 1 after

  // bisection: which bracket is showing
  const bp = stepAt(BISECT);
  const bIdx = bp <= 0 ? 0 : Math.min(TRAIL.length - 1, Math.floor(bp * TRAIL.length));
  const [lo, hi] = reset > 0 ? [0, TOTAL_PASSES] : TRAIL[bIdx];
  const found = bp >= 1 && reset === 0;

  // reduction: plates removed one by one from the top
  const rp = stepAt(REDUCE);
  const removed = reset > 0 ? Math.round((LINES_FROM - LINES_TO) * (1 - reset)) : Math.floor(rp * (LINES_FROM - LINES_TO + 0.999));

  const POST_SPAN = 1.9, POST_Y = 2.05;
  const postX = (n: number) => xOf(BISECT) - POST_SPAN / 2 + (n - 0.5) * (POST_SPAN / TOTAL_PASSES);
  const tip = toScreen([postX(CULPRIT), POST_Y + 0.72, 0], CAM, width, height);
  const lab = labelStyle(pal, k);

  const tiles = Array.from({ length: STEPS + 1 }, (_, i) => i);
  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 16, divisions: 16, y: -0.001 }}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${tip.x} ${tip.y}L${tip.x + 24 * k} ${tip.y - 14 * k}H${tip.x + 300 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} opacity={found ? 1 : 0.35} />
        </svg>
        <div style={{ ...lab, position: 'absolute', left: tip.x + 28 * k, top: tip.y - 34 * k, color: found ? pal.ink : pal.mute }}>
          bisect · pass {CULPRIT} of {TOTAL_PASSES} · instcombine
        </div>
        <div style={{ ...lab, position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>cea triage · example 05 · strict-aliasing UB</div>
          <div>steps and numbers from the author's recorded run, replayed</div>
        </div>
        {tiles.map((i) => {
          const p = toScreen([xOf(i), 0, 2.15], CAM, width, height);
          return <div key={i} style={{ ...lab, fontSize: 9 * k, position: 'absolute', left: p.x - 20 * k, width: 40 * k, textAlign: 'center', top: p.y - 6 * k }}>{i < STEPS ? i + 1 : 'rec'}</div>;
        })}
        <div style={{ ...lab, fontSize: 9.5 * k, position: 'absolute', left: 28 * k, bottom: 18 * k }}>
          <div>1 env · 2 check_ub · 3 differential · 4 bisect · 5 reduce</div>
          <div>6 timeline · 7-8 ir before/after · 9 alive2 (no verdict)</div>
          <div>tiles: evidence records · column: {LINES_FROM} → {LINES_TO} lines</div>
        </div>
      </>}>
      {/* the nine chained steps */}
      {Array.from({ length: STEPS }, (_, i) => {
        const s = stepAt(i) * live;
        const active = s > 0 && s < 1;
        const lift = active ? 0.08 * Math.sin(Math.PI * s) : 0;
        const fill = s <= 0 ? pal.f0 : active ? mix(pal.f1, pal.hi, 0.35) : mix(pal.f1, pal.hi, 0.1);
        return <Solid key={i} geometry={box} fill={fill} edge={s > 0 ? pal.hi : pal.e1} edgeOpacity={s > 0 ? 0.55 : 1} position={[xOf(i), 0.07 + lift, 0]} scale={[0.86, 0.14, 1.3]} />;
      })}
      {/* ledger row: one evidence record per step, then the triage record that cites them */}
      {tiles.map((i) => {
        const on = i < STEPS ? (phase >= T0 + (i + 1) * W ? 1 : 0) : (phase >= REC ? 1 : 0);
        const vis = on * live;
        if (i === OPEN) {
          return <lineSegments key={i} position={[xOf(i), 0.03, 1.55]}>
            <edgesGeometry args={[new THREE.BoxGeometry(0.42, 0.04, 0.42)]} />
            <lineBasicMaterial color={pal.accent} transparent opacity={vis * (0.55 + 0.45 * Math.cos(2 * Math.PI * 4 * phase))} />
          </lineSegments>;
        }
        if (vis <= 0) return <lineSegments key={i} position={[xOf(i), 0.02, 1.55]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.42, 0.02, 0.42)]} /><lineBasicMaterial color={pal.e0} />
        </lineSegments>;
        const big = i === STEPS ? 1.25 : 1;
        return <Solid key={i} geometry={box} fill={i === STEPS ? pal.accent : mix(pal.f1, pal.hi, 0.6)} edge={pal.hi}
          position={[xOf(i), 0.03, 1.55]} scale={[0.42 * big, 0.06, 0.42 * big]} />;
      })}
      {/* bisection: 270 passes as thin posts; the bracket narrows to pass 19 */}
      {Array.from({ length: TOTAL_PASSES }, (_, j) => {
        const n = j + 1;
        const inB = n > lo && n <= hi;
        const isC = n === CULPRIT && found;
        const h = isC ? 0.7 : 0.32;
        return <mesh key={n} position={[postX(n), POST_Y + h / 2, 0]}>
          <boxGeometry args={[isC ? 0.035 : POST_SPAN / TOTAL_PASSES * 0.55, h, isC ? 0.035 : 0.02]} />
          <meshBasicMaterial color={isC ? pal.accent : inB && bp > 0 && bp < 1 ? pal.accent : theme === 'dark' ? pal.mute : pal.e1} />
        </mesh>;
      })}
      <lineSegments position={[xOf(BISECT), POST_Y - 0.02, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(POST_SPAN, 0.001, 0.001)]} /><lineBasicMaterial color={pal.e1} />
      </lineSegments>
      {/* reduction: one plate per source line, 18 shrinking to 10 */}
      {Array.from({ length: LINES_FROM }, (_, j) => {
        const gone = j >= LINES_FROM - removed;
        const y = 0.24 + j * 0.075;
        if (gone) return <lineSegments key={j} position={[xOf(REDUCE), y, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.5, 0.04, 0.5)]} /><lineBasicMaterial color={pal.e1} transparent opacity={0.25} />
        </lineSegments>;
        return <Solid key={j} geometry={box} fill={mix(pal.f1, pal.hi, 0.12)} edge={pal.hi} edgeOpacity={0.5}
          position={[xOf(REDUCE), y, 0]} scale={[0.5, 0.04, 0.5]} />;
      })}
    </Stage>
  );
};
export default Scene;
