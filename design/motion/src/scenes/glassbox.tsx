// glassbox: the IOI circuit the blind run recovered in GPT-2 small, drawn on the model's real 12 x 12 head grid.
// Data: public/glassbox-ioi.json, converted from the glassbox repo:
//   benchmarks/ioi/experiments/E0014_ablation.json  (mean-ablation sweep of all 144 heads -> tone)
//   benchmarks/ioi/report/report.json               (circuit heads and edges -> lit path)
//   benchmarks/ioi/experiments/V0002_verify.json    (verification numbers)
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';
import data from '../../public/glassbox-ioi.json';

const CAM: Cam = { position: [8.5, 4.6, 17.5], target: [1.1, 3.2, 0], fov: 30 };
const DY = 0.5;                                         // layer spacing
const hx = (h: number) => (h - 5.5) * 0.92;              // head index -> x
const ly = (l: number) => l * DY;                        // layer -> y
const posOf = (id: string): [number, number, number] => {
  if (id === 'logits') return [hx(8.5), ly(12) + 0.35, 0];
  const [l, h] = id.split('.').map(Number);
  return [hx(h), ly(l) + 0.12, 0];
};

// stages of the recovered path, in the order the report describes it (layers rise with the stage)
const STAGES: string[][] = [
  ['3.0', '5.5', '6.9'],                 // duplicate-token and induction heads
  ['7.3', '7.9', '8.6', '8.10'],         // S2 readers
  ['9.9', '9.6', '10.0'],                // name movers
  ['10.7', '11.10'],                     // negative name movers
  ['logits'],
];
const T0 = [0.08, 0.2, 0.32, 0.44, 0.54];
const VERIFY_AT = 0.64;
const smooth = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const fadeOut = 1 - smooth(0.86, 0.95, phase);
  const stageOf = useMemo(() => {
    const m: Record<string, number> = {};
    STAGES.forEach((s, i) => s.forEach((id) => (m[id] = i)));
    return m;
  }, []);
  const lit = (id: string) => (id in stageOf ? smooth(T0[stageOf[id]], T0[stageOf[id]] + 0.05, phase) * fadeOut : 0);

  const plane = useMemo(() => new THREE.BoxGeometry(11.6, 0.02, 0.9), []);
  const cube = useMemo(() => new THREE.BoxGeometry(0.44, 1, 0.44), []);
  const bar = useMemo(() => new THREE.BoxGeometry(2.6, 0.08, 0.5), []);
  const maxAbs = useMemo(() => Math.max(...data.change.flat().map(Math.abs)), []);
  const edges = data.edges.filter(([a, b]) => a in stageOf && b in stageOf);

  const lines = useMemo(() => edges.map(([a, b]) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...posOf(a)), new THREE.Vector3(...posOf(b))]);
    return { a, b, g };
  }), []);

  const vOn = smooth(VERIFY_AT, VERIFY_AT + 0.05, phase) * fadeOut;
  const L0 = toScreen([-5.9, ly(0), 0.45], CAM, width, height);
  const L11 = toScreen([-5.9, ly(11), 0.45], CAM, width, height);
  const nm = toScreen([hx(9) + 0.24, ly(9) + 0.2, 0.22], CAM, width, height);
  const lg = toScreen(posOf('logits'), CAM, width, height);
  const v = data.verify;
  const lab = labelStyle(pal, k);

  return (
    <Stage theme={theme} cam={CAM} grid={false}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${nm.x} ${nm.y}L${nm.x + 40 * k} ${nm.y - 16 * k}H${nm.x + 210 * k}`} fill="none" stroke={pal.mute} strokeWidth={k} opacity={0.3 + 0.7 * lit('9.9')} />
        </svg>
        <div style={{ ...lab, position: 'absolute', left: nm.x + 90 * k, top: nm.y - 36 * k, color: pal.ink, opacity: 0.3 + 0.7 * lit('9.9') }}>Name mover 9.9</div>
        <div style={{ ...lab, position: 'absolute', left: L0.x - 74 * k, top: L0.y - 9 * k }}>Layer 0</div>
        <div style={{ ...lab, position: 'absolute', left: L11.x - 82 * k, top: L11.y - 9 * k }}>Layer 11</div>
        <div style={{ ...lab, position: 'absolute', left: lg.x - 50 * k, top: lg.y - 34 * k, color: pal.ink, opacity: 0.25 + 0.75 * lit('logits') }}>Logits (IO minus S)</div>
        <div style={{ ...lab, position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>IOI circuit in GPT-2 small, found blind</div>
          <div>benchmarks/ioi · E0014, report, V0002</div>
        </div>
        <div style={{ ...lab, position: 'absolute', left: 28 * k, bottom: 18 * k }}>
          <div>12 layers × 12 heads · tone: change when mean-ablated (E0014)</div>
          <div>lit: the 12 named heads of the reported circuit</div>
        </div>
        <div style={{ ...lab, position: 'absolute', right: 28 * k, top: 250 * k, textAlign: 'right', opacity: vOn }}>
          <div style={{ color: pal.accent }}>✓ V0002 verified</div>
          <div>full precision, local</div>
          <div>agreement {v.agreement.toFixed(3)}</div>
          <div>circuit alone {v.circuit_alone.toFixed(2)}</div>
          <div>{v.n_heldout} held-out prompts</div>
        </div>
      </>}>
      {Array.from({ length: 12 }, (_, l) => (
        <Solid key={`p${l}`} geometry={plane} fill={pal.f0} edge={pal.e1} edgeOpacity={0.55} position={[0, ly(l), 0]} />
      ))}
      {data.change.flatMap((row: number[], l: number) => row.map((c: number, h: number) => {
        const id = `${l}.${h}`;
        const u = Math.abs(c) / maxAbs;
        const hgt = 0.06 + 0.42 * u;
        const on = lit(id);
        const inCircuit = id in stageOf;
        const base = mix(pal.lo, pal.hi, 0.2 + 0.55 * Math.sqrt(u));
        return <Solid key={id} geometry={cube} fill={mix(base, pal.accent, on)}
          edge={inCircuit ? pal.accent : pal.e1} edgeOpacity={inCircuit ? 0.35 + 0.65 * on : 0.6}
          position={[hx(h), ly(l) + hgt / 2 + 0.01, 0]} scale={[1, hgt, 1]} />;
      }))}
      <Solid geometry={bar} fill={mix(pal.f1, pal.accent, lit('logits'))} edge={pal.accent} edgeOpacity={0.4 + 0.6 * lit('logits')} position={posOf('logits')} />
      {lines.map(({ a, b, g }) => (
        <lineSegments key={`${a}-${b}`} geometry={g}>
          <lineBasicMaterial color={pal.accent} transparent opacity={0.08 + 0.9 * lit(b)} />
        </lineSegments>
      ))}
    </Stage>
  );
};
export default Scene;

