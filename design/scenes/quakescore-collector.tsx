// quakescore-collector: one figure, three beats, white background.
// Claim: averaging window after window turns a phone's jagged noise spectrum into a clean floor with the
// injected tones standing on it, and the page's JavaScript reproduces the Python reference to six digits.
// Everything is from the synthetic test stream stream_c (1200 s, 59.94 Hz, tones 1.3 Hz on x and 7.0 Hz on y,
// 3e-3 m/s^2 noise; quakescore experiments/export_device_vectors.py). Never run on a real phone.
// 1. One window per band: a jagged spectrum. Ridges = running mean horizontal PSD (Gxx+Gyy)/2 after each
//    accepted window, computed by running the page's own dsp.js (identical to quakescore web/collector/dsp.js)
//    on tests/vectors/stream_c with BandAccumulator.accumulate observed; final ridge equals finish() to 6e-8.
//    -> public/quakescore-collector-waterfall.json (extract script in scratchpad/qc-extract/extract.mjs).
//    Bands: L 3.125 Hz (2048-pt window = 655 s), M 12.5 Hz (164 s), H 50 Hz (41 s); bins shown up to 0.86 x Nyquist.
// 2. Windows accumulate in real session time (window end times from the same run): 1 / 11 / 55 accepted
//    (accept fraction 0.944; the 2 s burst at ~200 s costs H two windows, visible as a gap). Tone peaks found at
//    1.294 and 7.007 Hz in the band-H mean (bin width 0.024 Hz).
// 3. Proof: quakescore web/collector/test_dsp.mjs (run 2026-11-14, ALL PASS), stream_c worst relative error of the
//    mean spectra JS vs the Python reference: L 5.549e-7, M 4.097e-7, H 4.871e-7, test tolerance 2e-5.
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, Axes3D, AxisLabels, Bar, Tube, Target, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type BandD = { fs: number; df: number; lo: number; hi: number; k: number; nTotal: number; tEnd: number[]; tone13: [number, number]; tone7: [number, number] | null; ridges: number[][] };
type D = { bands: Record<'L' | 'M' | 'H', BandD>; session: { tFirst: number; duration: number; acceptFraction: number }; jsVsPython: { L: number; M: number; H: number; rtol: number } };

const WF: Box = [7.2, 2.4, 6.4];
const WO: [number, number, number] = [-5.2, 0, 3.0];
const PB: Box = [3.5, 2.6, 0.9];
const PO: [number, number, number] = [3.0, 0, -0.6];
const ORDER = ['L', 'M', 'H'] as const;
const COL = { L: C.brown, M: C.purple, H: C.teal };
// depth slots front to back: L lane (1 window), gap, M lane (11), gap, H lane (55)
const GAP = 5;
const laneStart = { L: 0, M: 1 + GAP, H: 1 + GAP + 11 + GAP };
const SLOTS = 1 + GAP + 11 + GAP + 55;

const ax: Axis = { min: 0.003, max: 25, log: true, ticks: [0.01, 0.1, 1, 10], title: 'frequency', fmt: (v) => (v >= 1 ? String(v) : String(v)) + (v === 10 ? ' Hz' : '') };
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const pow10 = (e: number) => '10' + String(e).split('').map((c) => SUP[c] ?? c).join('');
const ay: Axis = { min: -9, max: -3.2, ticks: [-8, -6, -4], title: 'power', fmt: pow10 };
const sci = (v: number) => { const e = Math.floor(Math.log10(v)); return (v / 10 ** e).toFixed(1) + '·' + pow10(e); };

/** A waterfall ridge with an opaque pale curtain, so nearer ridges hide the ones behind (hidden-line look). */
const WRidge: React.FC<{ xs: number[]; ys: number[]; z: number; color: string; fill: string; lift: number; bold?: boolean }> = ({ xs, ys, z, color, fill, lift, bold }) => {
  const { line, wall, line2 } = useMemo(() => {
    const pos: number[] = [], idx: number[] = [], lp: number[] = [], lp2: number[] = [];
    xs.forEach((x, i) => {
      pos.push(x, ys[i], 0, x, 0, 0);
      lp.push(x, ys[i], 0.004);
      lp2.push(x, ys[i] + 0.006, 0.004);
      if (i < xs.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    });
    const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); w.setIndex(idx);
    const l = new THREE.BufferGeometry(); l.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    const l2 = new THREE.BufferGeometry(); l2.setAttribute('position', new THREE.Float32BufferAttribute(lp2, 3));
    return { line: l, wall: w, line2: l2 };
  }, [xs, ys]);
  if (lift < 0.003) return null;
  return (
    <group position={[WO[0], WO[1], WO[2] - z]} scale={[1, lift, 1]}>
      <mesh geometry={wall}><meshBasicMaterial color={fill} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} /></mesh>
      <line geometry={line}><lineBasicMaterial color={color} /></line>
      {bold ? <line geometry={line2}><lineBasicMaterial color={color} /></line> : null}
    </group>
  );
};

const camAt = (p: number): Cam => {
  const proof = span(p, 0.655, 0.955, 0.06);
  const az = -0.36 + 0.1 * Math.sin(TAU * p) + 0.16 * proof;
  const R = 15.6 + 1.4 * proof, el = 0.43 - 0.02 * proof;
  const tx = -1.5 + 2.5 * proof;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), -0.2 + R * Math.sin(el), R * Math.cos(el) * Math.cos(az)], target: [tx, 0.05, -0.6], fov: 27 };
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [d, setD] = React.useState<D | null>(null);
  const [h] = React.useState(() => delayRender('quakescore-collector'));
  React.useEffect(() => { fetch(staticFile('quakescore-collector-waterfall.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(h); }); }, [h]);
  const geo = useMemo(() => {
    if (!d) return null;
    const out: Record<string, { xs: number[]; ys: number[][]; zs: number[]; t: number[] }> = {};
    for (const b of ORDER) {
      const B = d.bands[b];
      const xs = B.ridges[0].map((_, i) => norm(ax, (B.lo + i) * B.df) * WF[0]);
      const ys = B.ridges.map((r) => r.map((v) => Math.max(0, norm(ay, v)) * WF[1]));
      const zs = B.ridges.map((_, n) => ((laneStart[b] + n + 0.5) / SLOTS) * WF[2]);
      out[b] = { xs, ys, zs, t: B.tEnd.map((t) => t - d.session.tFirst) };
    }
    return out;
  }, [d]);
  if (!d || !geo) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const reset = 1 - ease((p - 0.955) / 0.04);
  // session clock for beat 2: from the first H window's end to the end of the 1200 s stream
  const t0 = geo.H.t[0], t1 = d.session.duration;
  const clock = t0 + (t1 - t0) * 1.06 * Math.max(0, Math.min(1, (p - 0.34) / 0.27));
  const lift = (b: 'L' | 'M' | 'H', n: number) => {
    if (n === 0) { const start = { L: 0.04, M: 0.09, H: 0.14 }[b]; return ease((p - start) / 0.05) * reset; }
    if (p < 0.34) return 0;
    const t = geo[b].t[n]; const late = (clock - t) / ((t1 - t0) * 0.03);
    return ease(late) * reset;
  };
  const shown = (b: 'L' | 'M' | 'H') => geo[b].t.filter((_, n) => lift(b, n) > 0.5).length;
  const b2 = span(p, 0.34, 0.955, 0.03), b3 = span(p, 0.68, 0.955, 0.04);
  const c1 = span(p, 0.015, 0.315), c2 = span(p, 0.335, 0.655), c3 = span(p, 0.675, 0.955);
  const W = (pt: [number, number, number]) => project(pt, cam, width, height);
  // tone pins sit on the newest band-H ridge
  const nH = Math.max(1, shown('H')) - 1;
  const toneAt = (f: number) => {
    const B = d.bands.H; const i = Math.round(f / B.df) - B.lo;
    return W([WO[0] + geo.H.xs[i], geo.H.ys[nH][i] * lift('H', nH), WO[2] - geo.H.zs[nH]]);
  };
  const pv = d.jsVsPython;
  const py: Axis = { min: 1e-8, max: 1e-4, log: true, ticks: [1e-8, 1e-6, 1e-4], title: 'JS vs Python error', fmt: (v) => pow10(Math.round(Math.log10(v))) };
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="quakescore-collector" />
        <AxisLabels cam={cam} size={WF} origin={WO} x={ax} y={ay} />
        {ORDER.map((b) => {
          const n = shown(b); if (n === 0) return null;
          const z = geo[b].zs[n - 1];
          const xe = geo[b].xs[geo[b].xs.length - 1];
          return <Pin key={b} at={W([WO[0] + xe + 0.12, 0.05, WO[2] - z])} text={'×' + n} color={COL[b]} size={13} dy={8} opacity={Math.min(1, lift(b, 0)) * (1 - b3)} />;
        })}
        {c2 > 0.02 || c3 > 0.02 ? <>
          <Pin at={toneAt(1.3)} text="1.3 Hz" color={C.amber} size={13} opacity={b2 * (1 - b3)} dy={-8} />
          <Pin at={toneAt(7.0)} text="7.0 Hz" color={C.amber} size={13} opacity={b2 * (1 - b3)} dy={-8} />
        </> : null}
        {b3 > 0.02 ? <div style={{ opacity: b3 }}>
          <AxisLabels cam={cam} size={PB} origin={PO} x={{ min: 0, max: 1, ticks: [], title: '' }} y={py} />
          {ORDER.map((b, i) => {
            const xf = 0.25 + i * 0.29; const v = pv[b];
            return <Pin key={b} at={W([PO[0] + xf * PB[0], norm(py, v) * PB[1], PO[2] - PB[2] * 0.5])} text={sci(v)} color={COL[b]} size={11} />;
          })}
          <Pin at={W([PO[0] + PB[0] * 0.5, norm(py, pv.rtol) * PB[1], PO[2] + 0.05])} text={'limit ' + sci(pv.rtol)} color={C.green} size={12} dy={-14} />
        </div> : null}
        <Caption step={1} of={3} opacity={c1} text="One window per band: jagged noise." />
        <Source opacity={c1} text="page dsp.js · synthetic stream_c · 3 bands" />
        <Caption step={2} of={3} opacity={c2} text="Averaging windows settles the noise floor." />
        <Source opacity={c2} text={`1200 s · 1 / 11 / 55 windows kept · ${Math.round(d.session.acceptFraction * 1000) / 10}% accepted`} />
        <Caption step={3} of={3} opacity={c3} text="Page code matches Python to six digits." />
        <Source opacity={c3} text="test_dsp.mjs · stream_c · synthetic, never run on a phone" />
      </>}>
      <Axes3D size={WF} origin={WO} x={ax} y={ay} />
      {[1.3, 7.0].map((f) => {
        const x = WO[0] + norm(ax, f) * WF[0];
        return <Tube key={f} points={[[x, 0.004, WO[2]], [x, 0.004, WO[2] - WF[2]]]} color={C.amber} radius={0.014} opacity={0.9} />;
      })}
      {ORDER.map((b) => geo[b].ys.map((ys, n) => {
        const L = lift(b, n);
        const newest = n === shown(b) - 1;
        const col = mix(COL[b], '#FFFFFF', newest ? 0 : 0.35);
        return <WRidge key={b + n} xs={geo[b].xs} ys={ys} z={geo[b].zs[n]} color={col} fill={mix(COL[b], '#FFFFFF', 0.9)} lift={L} bold={newest} />;
      }))}
      {b3 > 0.02 ? <>
        <Axes3D size={PB} origin={PO} x={{ min: 0, max: 1, ticks: [], title: '' }} y={py} />
        <Target size={PB} origin={PO} yFrac={norm(py, pv.rtol)} color={C.green} />
        {ORDER.map((b, i) => {
          const xf = 0.25 + i * 0.29; const grow = ease((p - 0.7 - i * 0.03) / 0.06) * reset;
          return <Bar key={b} size={PB} origin={PO} xFrac={xf} zFrac={0.5} hFrac={Math.max(0.006, norm(py, pv[b]) * grow)} w={0.16} d={0.5} color={COL[b]} />;
        })}
      </> : null}
    </Stage>
  );
};
export default Scene;
