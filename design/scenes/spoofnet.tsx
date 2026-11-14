// spoofnet: one figure, three beats, white background.
// Claim: phones can see strong interference (spoofing nearly always, jamming when the phone has AGC),
//        and here is how far the jamming detector is from its 95 % target.
// 1. What a phone sees: per-signal C/N0 when an L1 jammer switches on. SIMULATED phone, generated with the repo's own
//    simulator: spoofnet.sim.catalog.attack_spec("test", "jam_moderate", 611) (a scored held-out scenario, flagship
//    phone with AGC + L5, L1_NARROW, 14.3 dB, open_walk), simulate(), 3-s mean. Rows = sub-bands as the repo groups
//    them (spoofnet/data.py SUBBANDS). Feature definition (spoofnet/detect/features.py extract(): drop_l1 = minus the
//    median per-signal residual against the phone's own baseline): median after onset L1 -13.7 dB, G1 -0.4, L5 0.0.
// 2. Detection rate per attack type and strength (replay, simulated phones).
//    Jamming: results/m3_detector.json + results/final_detector.json pooled, 250 runs per strength, as REPORT.md pools
//    them (moderate 122/250 = 49 %). Tier A (AGC + second band): weak 11/45, moderate 52/60, strong 41/42.
//    Spoofing / meaconing: results/final_detector.json test set, 100 runs each (REPORT.md "per phone" table).
// 3. Proof with the misses: REPORT.md targets: jamming (moderate) >= 95 % -> missed (coral); spoofing with consistent
//    pseudoranges >= 85 % -> met (green, plane only over those two bars; time-only, drag-off and meaconing have no
//    stated target and keep their hue). Clean real logs: results/m6_recorded_logs.json, 0 alarms in 2.84 h, 4 logs.
//    Real interference: one flight, one jamming event (results/m6_flight.json); app never built.
// Data file: public/spoofnet-v4.json (built from the files above by a script in the scratchpad).
import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import { Stage, Axes3D, AxisLabels, Bar, Target, Caption, Source, Name, Pin, C, SANS, usePhase, project, ease, span, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type R = { det: number; n: number; rate: number; tierA?: [number, number]; rateA?: number };
type D = {
  trace: { scenario: string; onset_index: number; drop_l1_median: number; drop_g1_median: number; drop_l5_median: number; signals: { c: string; b: string; v: number[] }[] };
  jam: Record<'weak' | 'moderate' | 'strong', R>;
  spoof: Record<'one' | 'all' | 'time' | 'drag' | 'meacon', R>;
  fa_real_clean: { alarms: number; hours: number; logs: number };
  targets: { jam_moderate_min: number; spoof_consistent_min: number };
};

const S: Box = [6.4, 2.5, 5.6];
const O: [number, number, number] = [-3.2, 0, 2.8];
const BANDS = ['L1', 'G1', 'L5'];   // B1 (BeiDou, partly hit) left out to keep three clean rows
const BAND_NAME: Record<string, string> = { L1: 'L1', B1: 'B1', G1: 'GLONASS', L5: 'L5' };
const BAND_COL: Record<string, string> = { L1: C.blue, B1: C.slate, G1: C.teal, L5: C.sand };
const BZ = [0.16, 0.5, 0.84];
const AZ = [0.16, 0.5, 0.84];              // jamming, spoofing, meaconing rows
const XC = [0.1, 0.34, 0.58, 0.82];        // columns
const CN0_MAX = 50;

const camAt = (p: number): Cam => {
  const proof = span(p, 0.66, 0.93, 0.06);   // back to 0 by p = 0.99: seamless
  const az = -0.4 + 0.08 * Math.sin(TAU * p) + 0.08 * proof;
  const high = span(p, 0.33, 0.95, 0.05);    // beats 2-3: look down more so the back rows clear the front row
  const R = 23.5 - 1.2 * proof, el = 0.44 + 0.2 * high;
  const tx = 0.2, tz = -0.1 + 0.3 * proof;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), 0.8 + R * Math.sin(el), tz + R * Math.cos(el) * Math.cos(az)], target: [tx, 0.95 - 0.45 * high, tz], fov: 19.5 };
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 960;
  const [d, setD] = React.useState<D | null>(null);
  const [h] = React.useState(() => delayRender('spoofnet'));
  React.useEffect(() => { fetch(staticFile('spoofnet-v4.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(h); }); }, [h]);
  if (!d) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const P = (x: number, y: number, z: number) => project([O[0] + x * S[0], y * S[1], O[2] - z * S[2]], cam, width, height);
  const reset = 1 - ease((p - 0.955) / 0.04);

  // ---------- beat 1: per-signal C/N0, time runs through the simulated trace
  const nT = d.trace.signals[0].v.length;
  const tt = Math.max(0, Math.min(nT - 1, ((p - 0.05) / 0.25) * (nT - 1)));
  const i0 = Math.floor(tt), fr = tt - i0, i1 = Math.min(nT - 1, i0 + 1);
  const on = d.trace.onset_index;
  const grow1 = ease((p - 0.015) / 0.04) * (1 - ease((p - 0.315) / 0.045));
  const b1 = span(p, 0.0, 0.33, 0.03);
  const jamOn = ease((tt - on) / 3);
  const rows = BANDS.map((b) => d.trace.signals.filter((s) => s.b === b));

  // ---------- beat 2/3: grouped detection bars
  const b2 = span(p, 0.345, 0.955, 0.04), b3 = span(p, 0.67, 0.955, 0.04);
  const rise = (i: number) => ease((p - 0.36 - i * 0.018) / 0.06) * reset;
  const T = d.targets;
  type G = { row: number; col: number; v: number; hue: string; label: string; target?: number };
  const bars: G[] = [
    { row: 0, col: 1, v: d.jam.weak.rate, hue: C.blue, label: 'weak', target: T.jam_moderate_min },
    { row: 0, col: 2, v: d.jam.moderate.rate, hue: C.blue, label: 'moderate', target: T.jam_moderate_min },
    { row: 0, col: 3, v: d.jam.strong.rate, hue: C.blue, label: 'strong', target: T.jam_moderate_min },
    { row: 1, col: 0, v: d.spoof.one.rate, hue: C.purple, label: '1 system', target: T.spoof_consistent_min },
    { row: 1, col: 1, v: d.spoof.all.rate, hue: C.purple, label: 'all', target: T.spoof_consistent_min },
    { row: 1, col: 2, v: d.spoof.time.rate, hue: C.purple, label: 'time' },
    { row: 1, col: 3, v: d.spoof.drag.rate, hue: C.purple, label: 'drag' },
    { row: 2, col: 0, v: d.spoof.meacon.rate, hue: C.brown, label: '' },
  ];
  const tierA = [d.jam.weak.rateA!, d.jam.moderate.rateA!, d.jam.strong.rateA!];
  const BW = 0.1, BD = 0.13;
  const tg = ease((p - 0.675) / 0.06) * reset;   // target planes rise from the floor
  const colOf = (g: G) => {
    if (!g.target) return g.hue;
    return g.v >= g.target ? mix(g.hue, C.green, 0.8 * b3) : mix(g.hue, C.coral, 0.8 * b3);
  };

  // axes: beat 1 in dB-Hz, beats 2-3 in % (same tick fractions)
  const yA: Axis = { min: 0, max: CN0_MAX, ticks: [0, 25, 50], title: 'C/N0 dB-Hz' };
  const yB: Axis = { min: 0, max: 1, ticks: [0, 0.5, 1], title: 'detected', fmt: (v) => Math.round(v * 100) + '%' };
  const xNone: Axis = { min: 0, max: 1, ticks: [], title: '' };
  const zA: Axis = { min: 0, max: 1, ticks: BZ, title: '', fmt: (v) => BAND_NAME[BANDS[BZ.indexOf(v)]] };
  const zB: Axis = { min: 0, max: 1, ticks: AZ, title: '', fmt: (v) => ['jamming', 'spoofing', 'meaconing'][AZ.indexOf(v)] };
  const yAx: Axis = { min: 0, max: 1, ticks: [0, 0.5, 1], title: '' };

  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  const pin1 = b1 * ease((tt - on - 8) / 4);
  const small: React.CSSProperties = { position: 'absolute', transform: 'translate(-50%,-50%)', fontFamily: SANS, fontSize: 10 * k, color: C.mute, whiteSpace: 'nowrap' };
  const fa = d.fa_real_clean;
  const lab = (q: { x: number; y: number }, text: string, color: string, al: 'l' | 'r' | 'c') => <div style={{ position: 'absolute', left: q.x + (al === 'l' ? 6 : al === 'r' ? -6 : 0) * k, top: q.y, transform: `translate(${al === 'l' ? '0' : al === 'r' ? '-100%' : '-50%'},-50%)`, opacity: b3, background: 'rgba(255,255,255,0.9)', borderRadius: 3 * k, padding: `${1 * k}px ${4 * k}px`, fontFamily: SANS, fontWeight: 700, fontSize: 11.5 * k, color, whiteSpace: 'nowrap' }}>{text}</div>;
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="spoofnet" />
        <div style={{ opacity: b1 }}><AxisLabels cam={cam} size={S} origin={O} x={xNone} y={yA} /></div>
        <div style={{ opacity: b2 }}><AxisLabels cam={cam} size={S} origin={O} x={xNone} y={yB} /></div>
        {[{ z: zA, o: b1 }, { z: zB, o: b2 }].map(({ z, o }, j) => o > 0.01 ? z.ticks.map((t) => {
          const q = P(-0.025, 0, t);
          return <div key={j + '-' + t} style={{ position: 'absolute', left: q.x, top: q.y, transform: 'translate(-100%,-50%)', opacity: o, fontFamily: SANS, fontSize: 12 * k, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>{z.fmt!(t)}</div>;
        }) : null)}
        {b2 > 0.02 ? <div style={{ opacity: b2 * (1 - 0.35 * b3) }}>
          {bars.filter((g) => g.label).map((g) => {
            // jamming row: label on the floor in front; back rows: label just above the bar top (the front row would hide the floor)
            const q = g.row === 0 ? P(XC[g.col], 0, AZ[g.row] - BD / 2 - 0.035) : P(XC[g.col], g.v * rise(0), AZ[g.row] + BD / 2);
            const o = g.row === 1 && g.target ? 1 - b3 : 1;
            return <div key={g.label} style={{ ...small, left: q.x, top: q.y, opacity: o, ...(g.row ? { transform: 'translate(-50%,-150%)', color: C.ink } : {}) }}>{g.label}</div>;
          })}
          {(() => { const q = P(XC[0], 0, AZ[0] - BD / 2 - 0.035); return <div style={{ ...small, left: q.x, top: q.y, opacity: 1 - b3 }}>none</div>; })()}
        </div> : null}
        {/* beat 1 pins */}
        <Pin at={P(0.99, 36 / CN0_MAX + 0.08, BZ[0])} text={`L1: −${d.trace.drop_l1_median.toFixed(0)} dB`} color={C.blue} size={15} opacity={pin1} />
        <Pin at={P(0.99, 40 / CN0_MAX + 0.08, BZ[2])} text="GLONASS, L5: steady" color={mix(C.sand, C.ink, 0.45)} size={12} opacity={pin1} />
        {/* beat 3 pins */}
        {b3 > 0.02 ? <>
          {(() => { const q = P(XC[2] - BW / 2, d.jam.moderate.rate + 0.1, AZ[0] - BD / 2); return <div style={{ position: 'absolute', left: q.x - 4 * k, top: q.y, transform: 'translate(-100%,-50%)', opacity: b3, background: 'rgba(255,255,255,0.92)', borderRadius: 4 * k, padding: `${1 * k}px ${5 * k}px`, fontFamily: SANS, fontWeight: 700, fontSize: 17 * k, color: mix(C.coral, C.ink, 0.3) }}>{Math.round(d.jam.moderate.rate * 100) + '%'}</div>; })()}
          {lab(P(XC[3] + 0.095, tierA[2] * 0.75, AZ[0] - BD * 0.4), `AGC phones ${Math.round(tierA[2] * 100)}%`, mix(C.amber, C.ink, 0.3), 'l')}
          {lab(P(0.995, T.jam_moderate_min * tg, AZ[0] + 0.135), 'target 95%', mix(C.coral, C.ink, 0.2), 'l')}
          {lab(P((XC[0] + XC[1]) / 2, 1.04, AZ[1]), 'target 85%', mix(C.green, C.ink, 0.3), 'c')}
          {lab(P(XC[0], 0, AZ[0] - BD / 2 - 0.045), `${fa.alarms} alarms, ${fa.hours.toFixed(1)} h real logs`, mix(C.green, C.ink, 0.3), 'c')}
        </> : null}
        <Caption step={1} of={3} opacity={c1} text="Jammer on: the L1 signals sag together." />
        <Source opacity={c1} text={`simulated phone · ${d.trace.scenario} · replay`} />
        <Caption step={2} of={3} opacity={c2} text="Detection rate by attack and strength." />
        <Source opacity={c2} text="simulated phones · 100–250 runs per bar · replay" />
        <Caption step={3} of={3} opacity={c3} text="Spoofing caught. Jamming far below target." />
        <Source opacity={c3} text="replay · real interference: 1 flight, 1 jam event" />
      </>}>
      <Axes3D size={S} origin={O} x={xNone} y={yAx} />
      {/* beat 1: one bar per tracked signal, rows = sub-bands */}
      {grow1 > 0.002 ? rows.map((sigs, r) => sigs.map((s, i) => {
        const n = sigs.length; const xf = 0.04 + (0.92 * (i + 0.5)) / n;
        const v = s.v[i0] * (1 - fr) + s.v[i1] * fr;
        const base = s.v.slice(0, on).reduce((a, b) => a + b, 0) / on;
        const col = BAND_COL[BANDS[r]];
        const w = Math.min(0.024, 0.55 / n);
        return <React.Fragment key={r + '-' + i}>
          <Bar size={S} origin={O} xFrac={xf} zFrac={BZ[r]} hFrac={(v / CN0_MAX) * grow1} w={w} d={0.1} color={col} />
          {base - v > 3 && tt > on ? <Bar size={S} origin={O} xFrac={xf} zFrac={BZ[r]} base={(v / CN0_MAX) * grow1} hFrac={((base - v) / CN0_MAX) * grow1} w={w * 1.04} d={0.104} color={C.coral} opacity={0.3} /> : null}
        </React.Fragment>;
      })) : null}
      {/* beats 2-3: grouped detection bars */}
      {b2 > 0.002 ? <>
        {bars.map((g, i) => <Bar key={g.label} size={S} origin={O} xFrac={XC[g.col]} zFrac={AZ[g.row]} hFrac={g.v * rise(i)} w={BW} d={BD} color={colOf(g)} />)}
        {/* no interference: clean real logs, zero alarms (flat green tile) */}
        <Bar size={S} origin={O} xFrac={XC[0]} zFrac={AZ[0]} hFrac={0.008 * rise(0)} w={BW} d={BD} color={mix(C.quiet, C.green, b3)} />
        {/* tier A phones (AGC + second band): thin amber bars beside each jamming bar */}
        {tierA.map((v, i) => { const g = ease((p - 0.7 - i * 0.025) / 0.06) * reset * b3; return g > 0.002 ? <Bar key={'A' + i} size={S} origin={O} xFrac={XC[i + 1] + 0.075} zFrac={AZ[0]} hFrac={v * g} w={0.03} d={BD * 0.8} color={C.amber} /> : null; })}
        {/* shortfall to the 95 % target on the measured case (moderate) */}
        {b3 > 0.02 ? <Bar size={S} origin={O} xFrac={XC[2]} zFrac={AZ[0]} base={d.jam.moderate.rate} hFrac={(T.jam_moderate_min - d.jam.moderate.rate) * ease((p - 0.72) / 0.06) * reset} w={BW * 1.02} d={BD * 1.02} color={C.coral} opacity={0.22 * b3} /> : null}
        {b3 > 0.02 ? <>
          <group visible={tg > 0.02}>
            <Target size={[S[0] * 0.76, S[1], S[2] * 0.27]} origin={[O[0] + S[0] * 0.23, 0, O[2] - S[2] * (AZ[0] - 0.135)]} yFrac={T.jam_moderate_min * tg} color={C.coral} />
            <Target size={[S[0] * 0.44, S[1], S[2] * 0.27]} origin={[O[0], 0, O[2] - S[2] * (AZ[1] - 0.135)]} yFrac={T.spoof_consistent_min * tg} color={C.green} />
          </group>
        </> : null}
      </> : null}
    </Stage>
  );
};
export default Scene;
