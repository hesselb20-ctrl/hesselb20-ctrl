// quakescore: one figure, three beats, white background.
// Claim: stacking nights lifts a building's peak out of the phone's noise, and the detection-limit table shows
// exactly where that works and where it does not (simulation only; 0 real buildings measured).
// 1. One night: a 9-storey building on a typical night, phone on the top floor, 80 ug/sqrt(Hz) phone.
//    results/m1_summary.md section 3, "Signal levels behind the table": peak 23 ug/sqrt(Hz), peak-to-noise power
//    ratio r = 0.034 for the low (80 ug) phone; typical f1 for 9 storeys = 1.68 Hz (detection table).
//    Damping 2% = quakescore/sim/building.py default zeta1. One 6 h night in band M (DESIGN.md 3.1: 163.84 s Hann
//    windows, 50% overlap, 0.0061 Hz bins) = about 263 windows, so the relative scatter of one night's spectrum is
//    1/sqrt(263). The plotted spectra are DRAWN from that law (seeded Gaussian scatter), not exported sessions.
// 2. Stacking: scatter shrinks as 1/sqrt(K) (DESIGN.md section 2) with K = 263 x nights, nights 1/2/5/10/20/50
//    (the session counts used by the detection-limit sweep).
// 3. Proof and limits: results/m1_summary.md section 3, "Phone on the top floor": nights needed before the first mode
//    is found within 2% in at least 90% of 12 trials, by storeys (2..40), night (energetic = windy 7 m/s, typical,
//    quiet) and phone noise (80 / 150 / 300 ug/sqrt(Hz)); '>50' = not reached with 50 nights (drawn as the coral wall).
//    The amber cell is the same case as beat 1 (9 storeys, typical night, 80 ug phone: 50 nights).
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, Axes3D, AxisLabels, Bar, Tube, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, mix, rng, TAU, type Cam, type Axis, type Box } from '../kit4';

// ---------------------------------------------------------------- data (m1_summary.md, top floor)
const STOREYS = [2, 3, 5, 7, 9, 12, 15, 25, 40];
const X = 0; // not reached within 50 nights
const NIGHTS: { night: string; phone: number; v: number[] }[] = [
  { night: 'windy', phone: 80, v: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { night: 'windy', phone: 150, v: [1, 2, 2, 5, 5, 5, 5, 1, 1] },
  { night: 'windy', phone: 300, v: [X, X, X, X, X, X, X, X, 1] },
  { night: 'typical', phone: 80, v: [5, 10, 20, 20, 50, 20, 50, X, 20] },
  { night: 'typical', phone: 150, v: [X, X, X, X, X, X, X, X, X] },
  { night: 'typical', phone: 300, v: [X, X, X, X, X, X, X, X, X] },
  { night: 'quiet', phone: 80, v: [X, X, X, X, X, X, X, X, X] },
  { night: 'quiet', phone: 150, v: [X, X, X, X, X, X, X, X, X] },
  { night: 'quiet', phone: 300, v: [X, X, X, X, X, X, X, X, X] },
];
const PHONE_COL: Record<number, string> = { 80: C.teal, 150: C.blue, 300: C.purple };
// row depth with a gap between night types
const rowZ = (j: number) => j + Math.floor(j / 3) * 0.6;
const ZMAX = rowZ(8);

// beat-1 case
const F1 = 1.68, ZETA = 0.02, R = 0.034, WIN_PER_NIGHT = 263;
const STACK = [1, 2, 5, 10, 20, 50];
const FREQ = Array.from({ length: 165 }, (_, i) => 1.18 + i * 0.0061);
const lor = (f: number) => 1 / (1 + ((f - F1) / (ZETA * F1)) ** 2);

// ---------------------------------------------------------------- layout
const SP: Box = [5.0, 2.2, 4.4];
const SO: [number, number, number] = [-8.9, 0, 2.2];
const LS: Box = [6.6, 2.7, 4.6];
const LO: [number, number, number] = [-0.4, 0, 2.3];

const sx: Axis = { min: FREQ[0], max: FREQ[FREQ.length - 1], ticks: [1.3, 1.68, 2.0], title: 'Hz', fmt: (v) => v.toFixed(v === 1.68 ? 2 : 1) };
const sy: Axis = { min: 0.85, max: 1.15, ticks: [0.9, 1, 1.1], title: 'power', fmt: (v) => (v === 1 ? 'floor' : v > 1 ? '+10%' : '−10%') };
const sz: Axis = { min: 0, max: STACK.length - 1, ticks: [0, 1, 2, 3, 4, 5], title: 'nights', fmt: (v) => String(STACK[v]) };

const lx: Axis = { min: -0.5, max: STOREYS.length - 0.5, ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8], title: 'storeys', fmt: (v) => String(STOREYS[v]) };
const ly: Axis = { min: 0.6, max: 90, log: true, ticks: [1, 5, 20, 50], title: 'nights', fmt: (v) => String(v) };
const lz: Axis = { min: -0.5, max: ZMAX + 0.5, ticks: [], title: '' };

const camAt = (p: number): Cam => {
  const proof = ease((p - 0.6) / 0.1) * (1 - ease((p - 0.955) / 0.045));
  const stack = ease((p - 0.33) / 0.08) * (1 - proof) * (1 - ease((p - 0.955) / 0.045));
  const az = -0.2 + 0.06 * Math.sin(TAU * p) - 0.12 * stack - 0.2 * proof;
  const Rr = 12.6 + 3.4 * stack + 3.6 * proof, el = 0.3 + 0.26 * stack + 0.16 * proof;
  const tx = -6.4 + 9.3 * proof, tz = -0.2 - 0.4 * stack;
  return { position: [tx + Rr * Math.cos(el) * Math.sin(az), 1.0 + Rr * Math.sin(el), tz + Rr * Math.cos(el) * Math.cos(az)], target: [tx, 1.0 - 0.6 * stack - 0.45 * proof, tz], fov: 27 };
};

/** A spectrum ridge with an opaque pale curtain and a doubled line (reads thicker at 960 px). ys in box fractions. */
const SRidge: React.FC<{ ys: number[]; zf: number; color: string; fill: string; opacity: number }> = ({ ys, zf, color, fill, opacity }) => {
  const g = useMemo(() => {
    const pos: number[] = [], idx: number[] = [], lp: number[] = [], lp2: number[] = [];
    ys.forEach((y, i) => {
      const x = (i / (ys.length - 1)) * SP[0], h = y * SP[1];
      pos.push(x, h, 0, x, 0, 0); lp.push(x, h, 0.004); lp2.push(x, h + 0.008, 0.004);
      if (i < ys.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    });
    const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); w.setIndex(idx);
    const l = new THREE.BufferGeometry(); l.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    const l2 = new THREE.BufferGeometry(); l2.setAttribute('position', new THREE.Float32BufferAttribute(lp2, 3));
    return { w, l, l2 };
  }, [ys]);
  if (opacity < 0.02) return null;
  return (
    <group position={[SO[0], SO[1], SO[2] - zf * SP[2]]}>
      <mesh geometry={g.w}><meshBasicMaterial color={fill} side={THREE.DoubleSide} transparent opacity={opacity} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} /></mesh>
      <line geometry={g.l}><lineBasicMaterial color={color} transparent opacity={opacity} /></line>
      <line geometry={g.l2}><lineBasicMaterial color={color} transparent opacity={opacity} /></line>
    </group>
  );
};

/** Pin with a white halo so it stays legible over bars and noisy lines. */
const Tag: React.FC<React.ComponentProps<typeof Pin>> = (props) => {
  const { width } = useVideoConfig(); const k = width / 960;
  const { at, text, color = C.ink, size = 12, opacity = 1, dy = -6 } = props;
  const h = 2.2 * k;
  return <div style={{ position: 'absolute', left: at.x, top: at.y + dy * k, transform: 'translate(-50%,-100%)', fontFamily: "'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif", fontWeight: 700, fontSize: size * k, color, opacity, whiteSpace: 'nowrap',
    textShadow: `0 0 ${h}px #fff, 0 0 ${h}px #fff, 0 0 ${2 * h}px #fff, ${h}px 0 #fff, -${h}px 0 #fff, 0 ${h}px #fff, 0 -${h}px #fff` }}>{text}</div>;
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const cam = camAt(p);
  const reset = 1 - ease((p - 0.955) / 0.04);

  // seeded spectra: (1 + r L(f)) * (1 + g / sqrt(263 n))
  const spectra = useMemo(() => STACK.map((n, k) => {
    const rnd = rng(17 + k * 101);
    const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
    const sd = 1 / Math.sqrt(WIN_PER_NIGHT * n);
    return FREQ.map((f) => Math.max(0, Math.min(1, norm(sy, (1 + R * lor(f)) * (1 + gauss() * sd)))));
  }), []);
  const truth = FREQ.map((f) => norm(sy, 1 + R * lor(f)));
  const rampCol = (k: number) => { const u = k / (STACK.length - 1); return u < 0.5 ? mix(C.slate, C.blue, u * 2) : mix(C.blue, C.teal, (u - 0.5) * 2); };

  const b1 = span(p, 0.0, 0.62, 0.03);
  const specOn = (1 - ease((p - 0.6) / 0.08)) * 1 + ease((p - 0.955) / 0.04);
  const ridgeIn = (k: number) => (k === 0 ? ease(p / 0.04) : ease((p - 0.34 - (k - 1) * 0.04) / 0.035));
  const landOn = p > 0.5 && p < 0.997;
  const b3 = span(p, 0.69, 0.955, 0.03);

  const c1 = span(p, 0.015, 0.32), c2 = span(p, 0.345, 0.64), c3 = span(p, 0.675, 0.955);
  const backK = STACK.length - 1;
  const backShown = ridgeIn(backK);

  // landscape cell geometry
  const cell = (i: number, j: number) => {
    const v = NIGHTS[j].v[i];
    const xf = norm(lx, i), zf = (rowZ(j) + 0.5) / (ZMAX + 1);
    const grow = ease((p - 0.56 - (j / 9) * 0.07 - (i / 9) * 0.02) / 0.05) * reset;
    return { v, xf, zf, grow };
  };
  const hero = { i: 4, j: 3 }; // 9 storeys, typical, 80 ug: 50 nights (same case as beat 1)
  const P = (pt: [number, number, number]) => project(pt, cam, width, height);
  const cellTop = (i: number, j: number) => {
    const { v, xf, zf } = cell(i, j);
    const h = v === X ? 1 : norm(ly, v);
    return P([LO[0] + xf * LS[0], h * LS[1], LO[2] - zf * LS[2]]);
  };
  const groupLabel = (g: number) => P([LO[0] - 0.05 * LS[0], 0, LO[2] - ((rowZ(g * 3 + 1) + 0.5) / (ZMAX + 1)) * LS[2]]);
  const phoneLabel = (j: number) => P([LO[0] + 1.04 * LS[0], 0, LO[2] - ((rowZ(j) + 0.5) / (ZMAX + 1)) * LS[2]]);
  const tickStyle: React.CSSProperties = { position: 'absolute', transform: 'translate(-50%,-50%)', fontFamily: "'Inter','Segoe UI',Arial,sans-serif", whiteSpace: 'nowrap' };
  const k = width / 960;
  const landLabels = ease((p - 0.58) / 0.06) * reset;

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="quakescore" />
        {specOn > 0.05 ? <div style={{ opacity: Math.min(1, specOn) }}>
          <AxisLabels cam={cam} size={SP} origin={SO} x={sx} y={sy} />
          {STACK.map((n, kk) => { const q = P([SO[0] + SP[0] * 1.03, 0, SO[2] - (kk / (STACK.length - 1)) * SP[2]]); return <div key={'n' + n} style={{ ...tickStyle, transform: 'translate(0,-50%)', left: q.x, top: q.y, fontSize: 10.5 * k, color: kk === 0 || kk === STACK.length - 1 ? C.ink : C.mute, opacity: ridgeIn(kk) * span(p, 0.0, 0.62, 0.03) }}>{n}{kk === 0 ? ' night' : kk === STACK.length - 1 ? ' nights' : ''}</div>; })}
        </div> : null}
        <Tag at={P([SO[0] + norm(sx, F1) * SP[0], truth[Math.round((F1 - FREQ[0]) / 0.0061)] * SP[1] + 0.02, SO[2]])} text="building 23 µg/√Hz" color={C.amber} size={12.5} opacity={span(p, 0.06, 0.32)} dy={-34} />
        <Tag at={P([SO[0] + SP[0] * 0.9, norm(sy, 1) * SP[1], SO[2]])} text="phone 80 µg/√Hz" color={C.slate} size={12.5} opacity={span(p, 0.08, 0.32)} dy={-40} />
        <Tag at={P([SO[0] + norm(sx, F1) * SP[0], truth[Math.round((F1 - FREQ[0]) / 0.0061)] * SP[1] + 0.05, SO[2] - SP[2]])} text="peak found" color={C.teal} size={12.5} opacity={span(p, 0.53, 0.64)} dy={-14} />
        {landLabels > 0.02 ? <div style={{ opacity: landLabels }}>
          <AxisLabels cam={cam} size={LS} origin={LO} x={lx} y={ly} />
          {['windy', 'typical', 'quiet'].map((g, gi) => { const q = groupLabel(gi); return <div key={g} style={{ ...tickStyle, left: q.x - 22 * k, top: q.y, fontSize: 11.5 * k, fontWeight: 600, color: C.ink }}>{g}</div>; })}
          {NIGHTS.slice(0, 3).map((r, j) => { const q = phoneLabel(j); return <div key={'ph' + j} style={{ ...tickStyle, transform: 'translate(0,-50%)', left: q.x - 2 * k, top: q.y, fontSize: 10 * k, color: j === 0 ? C.ink : C.mute }}>{r.phone}{j === 0 ? ' µg/√Hz phone' : ''}</div>; })}
        </div> : null}
        <Tag at={cellTop(6, 0)} text="1 night" color={C.teal} size={14} opacity={b3} dy={-4} />
        <Tag at={cellTop(hero.i, hero.j)} text="50 nights" color={C.amber} size={14} opacity={b3} dy={-6} />
        <Tag at={cellTop(4, 7)} text="not reached" color={C.coral} size={14} opacity={b3} dy={-6} />
        <Caption step={1} of={3} opacity={c1} text="One night: the building hides in phone noise." />
        <Source opacity={c1} text="m1_summary · 9 storeys, typical night · simulated" />
        <Caption step={2} of={3} opacity={c2} text="Stack nights: noise shrinks, the peak stands up." />
        <Source opacity={c2} text="DESIGN.md §2 · scatter ∝ 1/√K · 263 windows a night" />
        <Caption step={3} of={3} opacity={c3} text="Nights needed, and where it fails." />
        <Source opacity={c3} text="m1_summary · 81 cells × 12 trials · simulation only · 0 real buildings" />
      </>}>
      {specOn > 0.02 ? <>
        <Axes3D size={SP} origin={SO} x={sx} y={sy} z={sz} />
        {/* phone noise floor, drawn at the front */}
        <Tube points={[[SO[0], norm(sy, 1) * SP[1], SO[2] + 0.02], [SO[0] + SP[0], norm(sy, 1) * SP[1], SO[2] + 0.02]]} color={C.slate} radius={0.012} opacity={Math.min(1, specOn) * span(p, 0.03, 0.62)} />
        {spectra.map((ys, kk) => {
          const op = ridgeIn(kk) * (1 - ease((p - 0.6) / 0.08));
          const zf = kk / (STACK.length - 1);
          return <SRidge key={kk} ys={ys} zf={zf} color={rampCol(kk)} fill={mix(rampCol(kk), '#FFFFFF', 0.88)} opacity={op} />;
        })}
        {/* the building's own peak (the truth the stack has to recover): front in beat 1, back once 50 nights are in */}
        <Tube points={FREQ.filter((_, i) => i % 2 === 0).map((f) => [SO[0] + norm(sx, f) * SP[0], norm(sy, 1 + R * lor(f)) * SP[1] + 0.01, SO[2] + 0.03] as [number, number, number])} color={C.amber} radius={0.016} opacity={b1 * span(p, 0.05, 0.33)} />
        <Tube points={FREQ.filter((_, i) => i % 2 === 0 && Math.abs(FREQ[i] - F1) < 0.16).map((f) => [SO[0] + norm(sx, f) * SP[0], norm(sy, 1 + R * lor(f)) * SP[1] + 0.03, SO[2] - SP[2] + 0.02] as [number, number, number])} color={C.amber} radius={0.016} opacity={backShown * span(p, 0.52, 0.64)} />
      </> : null}
      {landOn ? <>
        <group>{landLabels > 0.02 ? <Axes3D size={LS} origin={LO} x={lx} y={ly} /> : null}</group>
        {NIGHTS.map((row, j) => row.v.map((_, i) => {
          const { v, xf, zf, grow } = cell(i, j);
          if (grow < 0.01) return null;
          const isHero = i === hero.i && j === hero.j;
          if (v === X) {
            // the coral ceiling: not reached within 50 nights. A faint column up to the 50 line, a solid slab above it.
            const h50 = norm(ly, 50);
            return <React.Fragment key={i + '-' + j}>
              <Bar size={LS} origin={LO} xFrac={xf} zFrac={zf} hFrac={h50 * grow} w={0.104} d={0.083} color={C.coral} opacity={0.07} />
              <Bar size={LS} origin={LO} xFrac={xf} zFrac={zf} base={h50 + (1 - h50) * (1 - grow)} hFrac={(1 - h50) * grow} w={0.104} d={0.083} color={C.coral} />
            </React.Fragment>;
          }
          const col = isHero ? mix(PHONE_COL[row.phone], C.amber, b3) : PHONE_COL[row.phone];
          return <Bar key={i + '-' + j} size={LS} origin={LO} xFrac={xf} zFrac={zf} hFrac={norm(ly, v) * grow} w={0.104} d={0.083} color={col} />;
        }))}
      </> : null}
    </Stage>
  );
};
export default Scene;
