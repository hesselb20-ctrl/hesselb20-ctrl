// glassbox: one figure, three beats, white background.
// Claim: a small circuit of attention heads does GPT-2 small's indirect-object task, checked on held-out prompts.
// 1. Switch off each of the 144 heads and measure the score lost   (benchmarks/ioi/experiments/E0014_ablation.json, 64 prompts)
//    The repo stores change = ablated - clean; plotted here as loss = clean - ablated, so tall = the task needs it.
// 2. The heads that matter form one circuit                         (benchmarks/ioi/report/report.json: 12 named heads, edges)
// 3. Held-out proof against the pass thresholds                     (V0002_verify.json, 200 prompts, full precision)
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import { SERIES, Stage, Axes3D, AxisLabels, Bar, Tube, Target, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type D = {
  change: number[][]; circuit_heads: string[]; edges: [string, string][]; n_e14: number;
  verify: { agreement: number; circuit_alone: number; circuit_ablated: number; n_heldout: number; circuit_size: number; thresholds: { agreement_min: number; circuit_alone_min: number; without_circuit_max: number } };
};
// one hue per layer, running through the muted palette from the first layer to the last
const RAMP = [C.teal, C.blue, C.purple, C.rose, C.amber];
const layerHue = (L: number) => { const u = (Math.max(0, Math.min(11, L)) / 11) * (RAMP.length - 1); const i = Math.min(RAMP.length - 2, Math.floor(u)); return mix(RAMP[i], RAMP[i + 1], u - i); };
const FIELD: Box = [6.4, 2.8, 6.4];
const FO: [number, number, number] = [-5.4, 0, 3.2];
const VER: Box = [2.7, 2.8, 1.0];
const VO: [number, number, number] = [2.3, 0, 0.5];

const camAt = (p: number): Cam => {
  const proof = span(p, 0.66, 0.955, 0.06);
  const az = -0.4 + 0.14 * Math.sin(TAU * p) + 0.26 * proof;
  const R = 15.4 - 0.4 * proof, el = 0.4;
  const tx = -1.5 + 2.5 * proof;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), 1.0 + R * Math.sin(el), R * Math.cos(el) * Math.cos(az)], target: [tx, 0.9, 0], fov: 27 };
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [d, setD] = React.useState<D | null>(null);
  const [h] = React.useState(() => delayRender('glassbox'));
  React.useEffect(() => { fetch(staticFile('glassbox-bench.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(h); }); }, [h]);
  const info = useMemo(() => {
    if (!d) return null;
    const known = (id: string) => id === 'logits' || /^mlp[0-9]+$/.test(id) || /^[0-9]+[.][0-9]+$/.test(id);
    return { inCircuit: new Set(d.circuit_heads), edges: d.edges.filter(([a, b]) => known(a) && known(b)) };
  }, [d]);
  if (!d || !info) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const ax: Axis = { min: -0.5, max: 11.5, ticks: [0, 3, 6, 9], title: 'head' };
  const az: Axis = { min: -0.5, max: 11.5, ticks: [0, 3, 6, 9], title: 'layer' };
  const ay: Axis = { min: -1.5, max: 1.25, ticks: [-1, 0, 1], title: 'score lost', fmt: (v) => (v > 0 ? '+' : '') + v };
  const y0 = norm(ay, 0);
  const reset = 1 - ease((p - 0.955) / 0.04);
  const b2 = span(p, 0.345, 0.955, 0.04), b3 = span(p, 0.68, 0.955, 0.04);
  const head = (id: string, lift = 0): [number, number, number] => {
    if (id === 'logits') return [FO[0] + FIELD[0] * 0.5, FIELD[1] * 1.1, FO[2] - FIELD[2] * 1.03];
    if (id.startsWith('mlp')) return [FO[0] - 0.3, y0 * FIELD[1], FO[2] - norm(az, +id.slice(3)) * FIELD[2]];
    const [L, H] = id.split('.').map(Number);
    return [FO[0] + norm(ax, H) * FIELD[0], Math.max(y0, norm(ay, -d.change[L][H])) * FIELD[1] + lift, FO[2] - norm(az, L) * FIELD[2]];
  };
  const v = d.verify, th = v.thresholds;
  const checks = [
    { name: 'match', val: v.agreement, thr: th.agreement_min, need: '≥' },
    { name: 'alone', val: v.circuit_alone, thr: th.circuit_alone_min, need: '≥' },
    { name: 'removed', val: v.circuit_ablated, thr: th.without_circuit_max, need: '≤' },
  ];
  const vy: Axis = { min: 0, max: 1, ticks: [0, 0.5, 1], title: '', fmt: (x) => Math.round(x * 100) + '%' };
  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="glassbox" />
        <AxisLabels cam={cam} size={FIELD} origin={FO} x={ax} y={ay} z={az} />
        {b3 > 0.02 ? <div style={{ opacity: b3 }}>
          <AxisLabels cam={cam} size={VER} origin={VO} x={{ min: 0, max: 1, ticks: [], title: '' }} y={vy} />
          {checks.map((c, i) => {
            const xf = 0.2 + i * 0.3;
            const top = project([VO[0] + xf * VER[0], Math.max(0, c.val) * VER[1], VO[2] - 0.5], cam, width, height);
            const foot = project([VO[0] + xf * VER[0], 0, VO[2] + 0.25], cam, width, height);
            const tq = project([VO[0] + (xf + 0.2) * VER[0], c.thr * VER[1], VO[2] - 0.2], cam, width, height);
            return <React.Fragment key={c.name}>
              <Pin at={top} text={Math.round(c.val * 100) + '%'} color={C.green} size={17} />
              <Pin at={foot} text={c.name} color={C.ink} size={10.5} dy={20} />
              <Pin at={tq} text={c.need + Math.round(c.thr * 100) + '%'} color={C.mute} size={9.5} dy={8} />
            </React.Fragment>;
          })}
        </div> : null}
        <Caption step={1} of={3} opacity={c1} text="Switch off each head. Measure the damage." />
        <Source opacity={c1} text={`E0014 · 144 heads · ${d.n_e14} prompts`} />
        <Caption step={2} of={3} opacity={c2} text="A few heads form one circuit." />
        <Source opacity={c2} text={`report.json · 12 of ${v.circuit_size} circuit parts shown`} />
        <Caption step={3} of={3} opacity={c3} text="Proof on unseen prompts: all three pass." />
        <Source opacity={c3} text={`V0002 · ${v.n_heldout} held-out prompts · full precision`} />
      </>}>
      <Axes3D size={FIELD} origin={FO} x={ax} y={ay} z={az} />
      {d.change.map((row, L) => row.map((raw, H) => {
        const loss = -raw; const id = `${L}.${H}`; const isC = info.inCircuit.has(id);
        const rise = ease((p - 0.03 - ((L * 12 + H) / 144) * 0.27) / 0.035) * reset;
        const mag = Math.abs(norm(ay, loss) - y0) * rise;
        const hue = layerHue(L);
        const baseCol = mix('#EDF0F4', hue, 0.55 + 0.45 * Math.min(1, Math.abs(loss) / 0.5));
        // circuit heads take a colour by depth in the model: early, middle, late layers
        const col = isC ? mix(baseCol, hue, b2) : mix(baseCol, '#E4E7EC', 0.22 * b2);
        return <Bar key={id} size={FIELD} origin={FO} xFrac={norm(ax, H)} zFrac={norm(az, L)} base={loss >= 0 ? y0 : y0 - mag} hFrac={Math.max(0.006, mag)} w={0.056} d={0.056} color={col} />;
      }))}
      {info.edges.map(([a, b], i) => {
        const t = ease((p - 0.36 - i * 0.014) / 0.05) * reset * b2;
        if (t < 0.04) return null;
        const A = head(a, 0.05), B = head(b, 0.05); const n = 16, m = Math.max(2, Math.round(n * t));
        const pts = Array.from({ length: m + 1 }, (_, j) => { const u = j / n; return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + 0.8 * Math.sin(Math.PI * u), A[2] + (B[2] - A[2]) * u] as [number, number, number]; });
        const lb = b === 'logits' ? 12 : +b.split('.')[0];
        return <Tube key={a + b} points={pts} color={layerHue(Math.min(11, lb))} radius={0.03} />;
      })}
      {b3 > 0.02 ? <>
        <Axes3D size={VER} origin={VO} x={{ min: 0, max: 1, ticks: [], title: '' }} y={vy} />
        {checks.map((c, i) => {
          const xf = 0.2 + i * 0.3; const grow = ease((p - 0.7 - i * 0.03) / 0.06) * reset;
          return <React.Fragment key={c.name}>
            <Bar size={VER} origin={VO} xFrac={xf} zFrac={0.5} hFrac={Math.max(0.006, Math.max(0, c.val) * grow)} w={0.17} d={0.45} color={C.green} />
            <Tube points={[[VO[0] + (xf - 0.12) * VER[0], c.thr * VER[1], VO[2] - 0.5 + 0.24], [VO[0] + (xf + 0.12) * VER[0], c.thr * VER[1], VO[2] - 0.5 + 0.24]]} color={C.ink} radius={0.018} />
          </React.Fragment>;
        })}
      </> : null}
    </Stage>
  );
};
export default Scene;
