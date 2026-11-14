// ghost-channel: one figure, three beats, white background.
// Claim: in the camera simulator the hidden flicker channel decodes up close and at strong amplitude, fails
// completely at 2 m, and never once hands over a wrong message.
// Data: public/ghost-channel-sweep.json, extracted from the repo's results/raw/sweep-{far,standard,dense}-{slide,talking}.json
// (npm run sim:sweep, one seed per cell). Only the five geometry columns are plotted: 0.4 m head-on, 0.4 m 30° off-axis,
// 1 m head-on (720p), 1 m 30° (720p), 2 m head-on (720p) = 120 trials (3 presets x 2 contents x 4 amplitude rows x 5).
// "decoded" = trial.decoded && trial.payloadOk (run-sweep.ts line 75 counts it the same way). Amplitudes 1/2/4 % are the
// colour (chroma) axis, 8 % is the brightness (luma) axis, as in the sweep rows.
// 1. The raw trials: one dot per trial, up = decoded, down on the floor (coral) = not decoded within 9 s.
// 2. The dots settle to their cell's share decoded: a success surface over distance x amplitude.
// 3. Proof and limits: 61-byte link in 1.7 s at 0.4 m (RESULTS.md section 6, standard preset, colour 2 % and 4 %);
//    2 m decodes 0 of 24 sweep trials (both contents, all presets and amplitudes); 0 wrong payloads in all 336 sweep
//    trials (RESULTS.md: 101/168 slide + 80/168 talking-head, "0 delivered a payload that differed").
//    Status: camera simulator only, never tested with a physical phone; invisibility to people never measured.
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { SANS, Stage, Axes3D, AxisLabels, Tube, Caption, Source, Name, C, usePhase, project, ease, span, norm, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type T = { preset: string; content: string; amp: number; axis: string; dist: number; yaw: number; ok: boolean; t: number | null };
type D = { allTrials: number; allDecoded: number; allWrong: number; trials: T[] };

const BOX: Box = [6.0, 2.5, 3.6];
const O: [number, number, number] = [-3.0, 0, 1.8];
const DISTS = [0.4, 1, 2];
const AMPS = [1, 2, 4, 8];
// x = amplitude (log), z = distance running from 2 m at the front to 0.4 m at the back
const ax: Axis = { min: 1, max: 8, ticks: [1, 2, 4, 8], title: 'amplitude', log: true, fmt: (v) => (v === 8 ? '8% luma' : v + '%') };
const az: Axis = { min: 2, max: 0.4, ticks: [2, 1, 0.4], title: 'distance', log: true, fmt: (v) => v + ' m' };
const ay: Axis = { min: 0, max: 1, ticks: [0.5, 1], title: 'decoded', fmt: (v) => Math.round(v * 100) + '%' };

const Tag: React.FC<{ at: { x: number; y: number }; text: string; color: string; opacity: number; dy?: number }> = ({ at, text, color, opacity, dy = -4 }) => {
  const { width } = useVideoConfig(); const k = width / 960;
  const halo = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]].map(([a, b]) => `${a * 2 * k}px ${b * 2 * k}px 0 #fff`).join(',');
  return <div style={{ position: 'absolute', left: at.x, top: at.y + dy * k, transform: 'translate(-50%,-100%)', fontFamily: SANS, fontWeight: 700, fontSize: 15 * k, color, opacity, whiteSpace: 'nowrap', textShadow: halo }}>{text}</div>;
};

const heightCol = (h: number) => (h < 0.5 ? mix(C.coral, C.sand, h / 0.5) : mix(C.sand, C.teal, (h - 0.5) / 0.5));

/** Smooth success surface: monotone smoothstep interpolation between the measured cells (no values beyond them). */
const field = (grid: number[][], xd: number, zf: number) => { // xd = distance in m, zf = amplitude fraction
  const s = (u: number) => u * u * (3 - 2 * u);
  const L = Math.log; const i = xd <= 1 ? 0 : 1; const u = s(Math.max(0, Math.min(1, (L(xd) - L(DISTS[i])) / (L(DISTS[i + 1]) - L(DISTS[i])))));
  const a = Math.min(2, Math.floor(zf * 3)); const w = s(Math.max(0, Math.min(1, zf * 3 - a)));
  const g = (di: number, ai: number) => grid[di][ai];
  const lo = g(i, a) * (1 - u) + g(i + 1, a) * u, hi = g(i, a + 1) * (1 - u) + g(i + 1, a + 1) * u;
  return lo * (1 - w) + hi * w;
};

const SuccessSurface: React.FC<{ grid: number[][]; opacity: number }> = ({ grid, opacity }) => {
  const [sx, sy, sz] = BOX; const nx = 41, nz = 31;
  const { mesh, lines } = useMemo(() => {
    const pos: number[] = [], col: number[] = [], idx: number[] = [], ln: number[] = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const xf = i / (nx - 1), zf = j / (nz - 1); const h = field(grid, 2 * Math.pow(0.2, zf), xf);
      pos.push(xf * sx, h * sy, -zf * sz);
      // measured distances sit at zf = 0, norm(1 m), 1; between them the surface is interpolated, so wash it out
      const near = Math.min(...DISTS.map((m) => Math.abs(zf - norm(az, m))));
      const c = new THREE.Color(mix(heightCol(h), '#FFFFFF', 0.6 * Math.min(1, near / 0.12))); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const q = j * nx + i; idx.push(q, q + nx, q + 1, q + 1, q + nx, q + nx + 1); }
    const seg = (q: number, r: number) => ln.push(pos[q * 3], pos[q * 3 + 1] + 0.004, pos[q * 3 + 2], pos[r * 3], pos[r * 3 + 1] + 0.004, pos[r * 3 + 2]);
    for (let j = 0; j < nz; j += 5) for (let i = 0; i < nx - 1; i++) seg(j * nx + i, j * nx + i + 1);
    for (let i = 0; i < nx; i += 5) for (let j = 0; j < nz - 1; j++) seg(j * nx + i, (j + 1) * nx + i);
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); m.setIndex(idx);
    const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(ln, 3));
    return { mesh: m, lines: w };
  }, [grid]);
  if (opacity < 0.01) return null;
  return (<>
    <group position={O}>
      <mesh geometry={mesh}><meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.85 * opacity} depthWrite={false} toneMapped={false} /></mesh>
      <lineSegments geometry={lines}><lineBasicMaterial color={C.slate} transparent opacity={0.25 * opacity} /></lineSegments>
    </group>
    {DISTS.map((m) => <Tube key={m} radius={0.016} color={C.ink} opacity={opacity} points={Array.from({ length: 41 }, (_, i) => { const xf = i / 40; return [O[0] + xf * sx, O[1] + field(grid, m, xf) * sy + 0.012, O[2] - norm(az, m) * sz] as [number, number, number]; })} />)}
  </>
  );
};

const camAt = (p: number): Cam => {
  const proof = span(p, 0.66, 0.955, 0.06);
  const az0 = 0.42 + 0.11 * Math.sin(TAU * p) - 0.1 * proof;
  const R = 16.2 - 0.6 * proof, el = 0.5 - 0.04 * proof;
  const tx = -0.15;
  return { position: [tx + R * Math.cos(el) * Math.sin(az0), 0.6 + R * Math.sin(el), R * Math.cos(el) * Math.cos(az0)], target: [tx, 0.95, -0.1], fov: 27 };
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [d, setD] = React.useState<D | null>(null);
  const [hd] = React.useState(() => delayRender('ghost-channel'));
  React.useEffect(() => { fetch(staticFile('ghost-channel-sweep.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(hd); }); }, [hd]);
  const info = useMemo(() => {
    if (!d) return null;
    const grid = DISTS.map((di) => AMPS.map((a) => { const c = d.trials.filter((t) => t.dist === di && t.amp === a); return c.filter((t) => t.ok).length / c.length; }));
    const PR = ['far', 'standard', 'dense'];
    const dots = d.trials.map((t, n) => {
      const di = DISTS.indexOf(t.dist), ai = AMPS.indexOf(t.amp);
      // inside each cell: presets side by side, contents (and the 30 deg view) one behind the other
      const sub = t.dist === 2 ? (t.content === 'slide' ? 0 : 1) : (t.content === 'slide' ? 0 : 2) + (t.yaw ? 1 : 0);
      const nSub = t.dist === 2 ? 2 : 4;
      const xf = norm(ax, t.amp) + (PR.indexOf(t.preset) - 1) * 0.034 + (ai === 0 ? 0.045 : ai === 3 ? -0.045 : 0);
      const zf = norm(az, t.dist) + (sub - (nSub - 1) / 2) * 0.042 + (di === 2 ? 0.075 : di === 0 ? -0.06 : 0);
      const order = ((2 - di) * 4 + ai) / 12 + (n % 7) * 0.004;
      return { t, xf, zf, mean: grid[di][ai], order };
    });
    const twoM = d.trials.filter((t) => t.dist === 2);
    return { grid, dots, twoMok: twoM.filter((t) => t.ok).length, twoMn: twoM.length };
  }, [d]);
  if (!d || !info) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const [sx, sy, sz] = BOX;
  const reset = 1 - ease((p - 0.955) / 0.04);
  const b2 = ease((p - 0.4) / 0.08) * reset, b3 = span(p, 0.69, 0.955, 0.04);
  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  const W = (xf: number, y: number, zf: number): [number, number, number] => [O[0] + xf * sx, O[1] + y * sy, O[2] - zf * sz];
  const P = (q: [number, number, number]) => project(q, cam, width, height);
  // proof anchors: the node, and the head of a short leader above it
  const LEAD = 0.3;
  const linkN = W(norm(ax, 4), info.grid[0][2], norm(az, 0.4) - 0.06), linkH = W(norm(ax, 4), info.grid[0][2] + LEAD, norm(az, 0.4) - 0.06);
  const okZ = (norm(az, 1) + norm(az, 0.4)) / 2 - 0.03, okN = W(0.93, info.grid[1][3], okZ), okH = W(0.93, info.grid[1][3] + LEAD * 0.6, okZ);
  const upA = W(norm(ax, 4), 1.06, norm(az, 0.4) - 0.06), dnA = W(norm(ax, 2), 0.02, 0.075);
  const edge = W(0.5, 0.05, 0);
  const pin = (k: number) => ease((p - 0.69 - k * 0.025) / 0.04) * b3;
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="ghost-channel" />
        <AxisLabels cam={cam} size={BOX} origin={O} x={ax} y={ay} z={az} />
        <Tag at={P(upA)} text="decoded" color={C.blue} opacity={span(p, 0.12, 0.325) * c1} dy={-8} />
        <Tag at={P(dnA)} text="not decoded" color={C.coral} opacity={span(p, 0.12, 0.325) * c1} dy={-10} />
        <Tag at={P(linkH)} text="61 B link in 1.7 s" color={C.amber} opacity={pin(0)} />
        <Tag at={P(edge)} text={`2 m: ${info.twoMok} / ${info.twoMn} decoded`} color={C.coral} opacity={pin(1)} dy={-12} />
        <Tag at={P(okH)} text={`${d.allWrong} wrong payloads`} color={C.green} opacity={pin(2)} />
        <Caption step={1} of={3} opacity={c1} text="One dot per simulated flicker read." />
        <Source opacity={c1} text={`sweep-*.json · ${d.trials.length} trials · camera simulator`} />
        <Caption step={2} of={3} opacity={c2} text="The trials settle into a success map." />
        <Source opacity={c2} text="3 distances measured · surface interpolated" />
        <Caption step={3} of={3} opacity={c3} text="Works close, fails at 2 m, never wrong." />
        <Source opacity={c3} text={`simulator only · no phone tested · ${d.allTrials} trials`} />
      </>}>
      <Axes3D size={BOX} origin={O} x={ax} y={ay} z={az} />
      <SuccessSurface grid={info.grid} opacity={b2} />
      {info.dots.map(({ t, xf, zf, mean, order }, n) => {
        const appear = ease((p - 0.02 - order * 0.15) / 0.05) * reset;
        if (appear < 0.01) return null;
        const settle = ease((p - 0.37 - order * 0.08) / 0.1);
        const y0 = t.ok ? 1 : 0;
        const y = (y0 + (mean - y0) * settle) * sy + 0.07 + (1 - appear) * 0.45;
        const col = t.ok ? C.blue : C.coral;
        return (
          <mesh key={n} position={[O[0] + xf * sx, O[1] + y, O[2] - zf * sz]} scale={0.062 * appear}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshLambertMaterial color={col} />
          </mesh>
        );
      })}
      {b3 > 0.02 ? <>
        <Tube points={[W(0, 0.01, 0), W(1, 0.01, 0)]} color={C.coral} radius={0.04 * pin(1)} />
        <Tube points={[linkN, linkH]} color={C.amber} radius={0.022 * pin(0)} />
        <Tube points={[okN, okH]} color={C.green} radius={0.022 * pin(2)} />
      </> : null}
    </Stage>
  );
};
export default Scene;
