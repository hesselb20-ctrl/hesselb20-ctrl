// liveseal: one figure, three beats, white background.
// Claim: the hidden, signed seal survives real video compression above a bitrate floor, and here is exactly where it
//   breaks; the targets it still misses are shown next to it.
// 1. One seal period as its real signal: the 122-byte signed statement (wire form of the docs/PROTOCOL.md section 12 test
//    vector; bytes 58..121 are the Ed25519 signature) spread over 32x18 cells in three planes (Y, Cb, Cr), 8 slots of
//    250 ms. Cell signs and pilots: public/liveseal-period.json (core/src/modem.ts DEFAULT_MODEM on that vector).
//    Cell relief is exaggerated (real amplitude 2 / 3 / 3 of 255 levels).
// 2. Survival grid: share of 2 s periods whose statement came back bit-exact, default seal, by bitrate (x) and codec
//    rows (z) grouped by picture: 640x360, 1280x720, CIF 352x288, hand-held CIF. docs/EVALUATION.md tables
//    matrix-360-default, matrix-720-default, matrix-cif-default, matrix-handheld-default (section 2, codec simulator:
//    ffmpeg libvpx / libx264 / libaom, real-time settings). Green = at least 99% (the project's per-period target),
//    coral = below it; the coral cap is the lost share. Empty outline = not tested.
// 3. Honest misses, browser loop-back (docs/browser-loopback.json, one laptop, no network):
//    time to green as documented in EVALUATION.md 7.3 against the 5 s target: cold start, 8 runs VP8 600 kbps,
//    5.7 to 7.4 s, median 6.5 s; joining a sealed call, 12 joins, 4.1 to 5.9 s, median 5.1 s (bar = median, line = range); sealing cost 2.55 ms = 7.6% of a core at 360p and
//    5.91 ms = 17.7% at 720p against the 15% target (EVALUATION.md 7.3); mouth-only edits passed as green in
//    130 of 182 + 136 of 168 = 266 of 350 periods (EVALUATION.md 6.2). No real call between two machines was made.
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, Axes3D, AxisLabels, Bar, Tube, Target, Caption, Source, Name, Pin, C, usePhase, project, ease, span, mix, TAU, SANS, type Cam, type Axis, type Box } from '../kit4';

type Period = { gridW: number; gridH: number; planes: number; symbols: number; amplitude: number[]; pilots: string; slots: string[] };

// ---------------------------------------------------------------- data (docs/EVALUATION.md section 2, default seal)
const KBPS = [300, 600, 1000, 2000];
const CODECS = ['VP8 dn', 'VP8', 'VP9', 'H.264', 'AV1'];
const CODEC_COL = [C.teal, C.sand, C.purple, C.brown, C.slate];
type Group = { name: string; n: number; cells: (number | null)[][] };
const GROUPS: Group[] = [
  { name: '360p', n: 36, cells: [[6, 36, 36, 36], [25, 36, 36, 36], [36, 36, 36, 36], [36, 36, 36, 36], [36, 36, 36, 36]] },
  { name: '720p', n: 36, cells: [[null, 4, 35, 36], [null, 9, 36, 36], [null, 36, 36, 36], [null, 36, 36, 36], [null, 36, 36, 36]] },
  { name: 'CIF', n: 72, cells: [[41, 71, null, null], [62, 72, null, null], [71, 72, null, null], [72, 72, null, null], [71, 72, null, null]] },
  { name: 'hand-held', n: 9, cells: [[0, 5, null, null], [0, 6, null, null], [2, 6, null, null], [6, 6, null, null], [6, 6, null, null]] },
];
const PASS = 0.99;
const WIRE = '88014301020344c1c3dc951a35a4e900444d1f669a582000070e151c232a31383f464d545b626970777e858c939aa1a8afb6bdc4cbd2d9405840c52780e78c3eb75a3019e8629bc07bf116342dbcc0db85ac0e2f375b238b09df8857eeced354694cc51f55d04a20972f94b6434d358bb9daf1e37e660a3e4200';
const BYTES = Array.from({ length: WIRE.length / 2 }, (_, i) => parseInt(WIRE.slice(i * 2, i * 2 + 2), 16));
const SIG0 = 58; // bytes 58..121: Ed25519 signature
const JOIN = { lo: 4.1, med: 5.1, hi: 5.9 };
const COLD = { lo: 5.7, med: 6.5, hi: 7.4 }; // EVALUATION.md 7.3: 8 cold-start runs, VP8 600 kbps
const CPU = [{ res: '360p', v: 7.6 }, { res: '720p', v: 17.7 }];
const MOUTH = { pass: 266, n: 350 };

// ---------------------------------------------------------------- layout
// rows (codec x picture) run left to right, bitrate runs from the front (300k) to the back (2M)
const ROWP = 0.3, GAP = 0.45, BITP = 0.78;
const GO: [number, number, number] = [-3.9, 0, 1.6];
const GRID: Box = [20 * ROWP + 3 * GAP, 0.55, BITP * 4];
const rowX = (g: number, k: number) => (g * 5 + k + 0.5) * ROWP + g * GAP;
const groupX = (g: number) => rowX(g, 2);
const bitZ = (i: number) => (i + 0.5) * BITP;
const PO: [number, number, number] = [4.6, 0, 1.0]; // proof shelf origin
const TT: Box = [2.1, 1.6, 0.6], CP: Box = [0.9, 1.6, 0.6];
const TTO: [number, number, number] = [PO[0], 0, PO[2]];
const CPO: [number, number, number] = [PO[0] + 2.7, 0, PO[2]];
const MO: [number, number, number] = [PO[0] + 4.2, 0, PO[2]];

const camAt = (p: number): Cam => {
  const g = span(p, 0.3, 0.955, 0.07), pr = span(p, 0.665, 0.955, 0.06);
  const az = -0.3 + 0.07 * Math.sin(TAU * p) + 0.12 * g + 0.05 * pr;
  const el = 0.42 + 0.34 * g - 0.34 * pr;
  const R = 10.5 + 1.0 * g + 0.4 * pr;
  const t: [number, number, number] = [-1.2 + 0.6 * g + 6.4 * pr, 0.75 - 1.05 * g + 0.9 * pr, -0.2 + 0.5 * g + 0.2 * pr];
  return { position: [t[0] + R * Math.cos(el) * Math.sin(az), t[1] + R * Math.sin(el), t[2] + R * Math.cos(el) * Math.cos(az)], target: t, fov: 30 };
};

// ---------------------------------------------------------------- beat 1: the seal period
const PLW = 2.0, PLH = 1.125; // plane size, 16:9
const PLANE_COL = [C.blue, C.sky, C.rose];
const planePos = (pl: number): [number, number, number] => [-3.4 + pl * 2.2, 0.45, -0.3 - pl * 0.2];

const SealPlanes: React.FC<{ d: Period; p: number; vis: number }> = ({ d, p, vis }) => {
  const N = d.gridW * d.gridH;
  p = p > 0.9 ? p - 1 : p; // the loop's last frames rebuild the blank frame of p = 0
  const meshes = useMemo(() => [0, 1, 2].map(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true }), N);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m;
  }), [N]);
  const cs = PLW / d.gridW;
  const sf = Math.max(0, (p - 0.02) / 0.3) * 8; // 8 slots across beat 1 (slowed 1.6x)
  const slot = Math.min(7, Math.floor(sf)), prev = Math.max(0, slot - 1), fr = sf - Math.floor(sf);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  // fold: the frame lays down flat and sinks into the floor before the grid rises
  const fold = ease((p - 0.3) / 0.06);
  meshes.forEach((im, pl) => {
    const amp = d.amplitude[pl];
    const sweep = ease((p - 0.03 - pl * 0.025) / 0.07);
    for (let i = 0; i < N; i++) {
      const idx = pl * N + i;
      const a = d.slots[prev][idx] === '+' ? 1 : -1, b = d.slots[slot][idx] === '+' ? 1 : -1;
      const sgn = a + (b - a) * ease(fr / 0.3);
      const pil = d.pilots[idx] === '1';
      const qx = i % d.gridW, r = Math.floor(i / d.gridW);
      const lit = ease((sweep * 1.3 - qx / d.gridW) / 0.3);
      const depth = (0.02 + Math.abs(sgn) * amp * 0.03 * lit);
      v.set((qx + 0.5) * cs - PLW / 2, PLH / 2 - (r + 0.5) * cs, sgn * amp * 0.015 * lit);
      sc.set(cs * 0.86, cs * 0.86, depth); m4.compose(v, q, sc); im.setMatrixAt(i, m4);
      const base = PLANE_COL[pl];
      const c = pil ? C.ink : sgn > 0 ? base : mix(base, '#ffffff', 0.62);
      col.set(mix('#F1F3F6', c, lit)); im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    (im.material as THREE.MeshLambertMaterial).opacity = vis;
  });
  return <>{meshes.map((im, pl) => {
    const [x, y, z] = planePos(pl);
    return <group key={pl} position={[x, y + PLH / 2 * (1 - fold) - 0.5 * fold, z]} rotation={[-Math.PI / 2 * fold, 0, 0]} visible={vis > 0.01}>
      <primitive object={im} />
    </group>;
  })}</>;
};

const ByteStrip: React.FC<{ p: number; vis: number }> = ({ p, vis }) => {
  const x0 = -3.6, z = 1.3, w = 5.6 / BYTES.length;
  p = p > 0.9 ? p - 1 : p;
  const fold = ease((p - 0.29) / 0.05);
  return <group visible={vis > 0.01}>{BYTES.map((b, i) => {
    const grow = ease((p - 0.02 - i * 0.0004) / 0.04) * (1 - fold);
    const h = Math.max(0.004, (0.04 + (b / 255) * 0.36) * grow);
    const sig = i >= SIG0;
    return <mesh key={i} position={[x0 + (i + 0.5) * w, h / 2, z]} scale={[w * 0.72, h, 0.07]}>
      <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={sig ? C.amber : i >= 22 && i < 56 ? C.teal : C.blue} transparent opacity={vis} />
    </mesh>;
  })}</group>;
};

// ---------------------------------------------------------------- scene
const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [d, setD] = React.useState<Period | null>(null);
  const [h] = React.useState(() => delayRender('liveseal'));
  React.useEffect(() => { fetch(staticFile('liveseal-period.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(h); }); }, [h]);
  if (!d) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const P = (pt: [number, number, number]) => project(pt, cam, width, height);
  const reset = 1 - ease((p - 0.955) / 0.04);
  const b1 = 1 - ease((p - 0.335) / 0.03) + ease((p - 0.955) / 0.04);
  const b2 = ease((p - 0.32) / 0.03) * reset, b3 = span(p, 0.67, 0.955, 0.04);
  const c1 = span(p, 0.015, 0.31), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);

  const ax: Axis = { min: 0, max: GRID[0], ticks: [], title: '' };
  const ay: Axis = { min: 0, max: 1, ticks: [0, 1], title: '', fmt: (v) => Math.round(v * 100) + '%' };
  const az: Axis = { min: 0, max: GRID[2], ticks: [0, 1, 2, 3].map(bitZ), title: 'bitrate', fmt: (v) => ['300k', '600k', '1M', '2M'][Math.round(v / BITP - 0.5)] };

  // tiles in rise order: lowest bitrate first, then across the rows
  const tiles: { g: number; k: number; i: number; share: number | null; order: number }[] = [];
  [0, 1, 2, 3].forEach((i) => GROUPS.forEach((G, g) => G.cells.forEach((row, k) => tiles.push({ g, k, i, share: row[i] === null ? null : row[i]! / G.n, order: tiles.length }))));
  const riseAt = (o: number) => 0.355 + (o / tiles.length) * 0.24;

  const tq = (s: number): number => s / 8; // seconds axis 0..8
  const top = (g: number, k: number, i: number): [number, number, number] => [GO[0] + rowX(g, k), GRID[1] + 0.12, GO[2] - bitZ(i) + BITP * 0.4];
  const pinsB2 = [
    { at: P(top(0, 0, 0)), text: 'VP8 300k: 6/36', col: C.coral },
    { at: P(top(1, 0.5, 1)), text: '720p 600k: 4/36', col: C.coral },
    { at: P(top(3, 0.5, 0)), text: 'hand-held ≤ 6/9', col: C.coral },
  ];
  const b2pin = span(p, 0.55, 0.665, 0.03);

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="liveseal" />
        {b2 > 0.02 ? <div style={{ opacity: b2 * (1 - ease((p - 0.67) / 0.04)) }}>
          <AxisLabels cam={cam} size={GRID} origin={GO} x={ax} y={ay} z={az} />
          {CODECS.map((c, k) => { const q = P([GO[0] + rowX(0, k), 0, GO[2] + 0.3]); return <div key={c} style={{ position: 'absolute', left: q.x, top: q.y, transform: 'translate(-100%,0) rotate(-40deg)', transformOrigin: '100% 0', fontFamily: SANS, fontSize: 9 * width / 960, fontWeight: 700, color: CODEC_COL[k], whiteSpace: 'nowrap' }}>{c}</div>; })}
          {GROUPS.map((G, g) => <Pin key={G.name} at={P([GO[0] + groupX(g), GRID[1] + 0.05, GO[2] - GRID[2]])} text={G.name} color={C.ink} size={11.5} />)}
          {pinsB2.map((x) => <div key={x.text} style={{ position: 'absolute', left: x.at.x, top: x.at.y - 4 * width / 960, transform: 'translate(-50%,-100%)', opacity: b2pin, background: 'rgba(255,255,255,0.9)', borderRadius: 4, padding: '1px 5px', fontFamily: SANS, fontWeight: 700, fontSize: 13 * width / 960, color: x.col, whiteSpace: 'nowrap' }}>{x.text}</div>)}
        </div> : null}
        {b3 > 0.02 ? <div style={{ opacity: b3 }}>
          <Pin at={P([TTO[0] + TT[0] * 0.45, TT[1] * tq(7.4) + 0.15, TTO[2] - 0.3])} text="median 6.5 s" color={C.coral} size={15} />
          <Pin at={P([TTO[0] + TT[0] + 0.28, TT[1] * tq(5), TTO[2] - 0.3])} text="5 s" color={C.ink} size={11} dy={8} />
          <Pin at={P([CPO[0] + CP[0] * 0.72, CP[1] * (17.7 / 20) + 0.1, CPO[2] - 0.3])} text="17.7%" color={C.coral} size={15} />
          <Pin at={P([CPO[0] + CP[0] + 0.3, CP[1] * (15 / 20), CPO[2] - 0.3])} text="15%" color={C.ink} size={11} dy={8} />
          <Pin at={P([MO[0] + 0.62, 1.6 + 0.1, MO[2] - 0.3])} text={`${MOUTH.pass}/${MOUTH.n} pass`} color={C.coral} size={15} />
          {[{ x: TTO[0] + TT[0] / 2, t: 'time to verify' }, { x: CPO[0] + CP[0] / 2, t: 'CPU' }, { x: MO[0] + 0.62, t: 'mouth edits' }].map((l) => (
            <Pin key={l.t} at={P([l.x, 0, PO[2] + 0.3])} text={l.t} color={C.ink} size={10.5} dy={16} />))}
        </div> : null}
        {c1 > 0.02 ? <div style={{ opacity: c1 }}>
          {['Y', 'Cb', 'Cr'].map((t, pl) => { const [x, y, z] = planePos(pl); return <Pin key={t} at={P([x - PLW / 2 + 0.1, y + PLH + 0.05, z])} text={t} color={PLANE_COL[pl] === C.sky ? '#6E9FC2' : PLANE_COL[pl]} size={13} />; })}
          <Pin at={P([-3.6 + 5.6 * 0.74, 0.5, 1.3])} text="Ed25519 signature" color={C.amber} size={12} />
        </div> : null}
        <Caption step={1} of={3} opacity={c1} text="One signed statement, spread over 1,728 cells." />
        <Source opacity={c1} text="PROTOCOL.md §12 vector · modem.ts · relief exaggerated" />
        <Caption step={2} of={3} opacity={c2} text="Real codecs: it holds above a bitrate floor." />
        <Source opacity={c2} text="EVALUATION.md §2 · ffmpeg codec simulation · 2,070 periods" />
        <Caption step={3} of={3} opacity={c3} text="Honest misses: speed, CPU, mouth-only edits." />
        <Source opacity={c3} text="browser loop-back, one laptop · no real call made" />
      </>}>
      {/* beat 1 */}
      {b1 > 0.01 ? <>
        <SealPlanes d={d} p={p} vis={b1} />
        <ByteStrip p={p} vis={b1} />
      </> : null}
      {/* beat 2: survival grid */}
      {b2 > 0.01 ? <>
        <Axes3D size={GRID} origin={GO} x={ax} y={ay} z={az} />
        {GROUPS.map((_, g) => CODECS.map((_, k) => (
          <mesh key={g + '-' + k} position={[GO[0] + rowX(g, k), 0.01, GO[2] + 0.16]} scale={[ROWP * 0.78, 0.02, 0.14]}>
            <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={CODEC_COL[k]} transparent opacity={b2} />
          </mesh>)))}
        {tiles.map((t) => {
          const x = GO[0] + rowX(t.g, t.k), z = GO[2] - bitZ(t.i);
          if (t.share === null) {
            return <lineSegments key={t.order} position={[x, 0.005, z]} scale={[ROWP * 0.8, 1, BITP * 0.84]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)]} /><lineBasicMaterial color={C.quiet} transparent opacity={b2} />
            </lineSegments>;
          }
          const rise = ease((p - riseAt(t.order)) / 0.03) * reset;
          if (rise < 0.01) return null;
          const ok = t.share >= PASS;
          const hg = Math.max(0.004, t.share * GRID[1] * rise), hl = (1 - t.share) * GRID[1] * rise;
          return <group key={t.order}>
            <mesh position={[x, hg / 2, z]} scale={[ROWP * 0.72, hg, BITP * 0.8]}>
              <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={C.green} />
            </mesh>
            {hl > 0.004 ? <mesh position={[x, hg + hl / 2, z]} scale={[ROWP * 0.72, hl, BITP * 0.8]}>
              <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={C.coral} transparent opacity={0.85} />
            </mesh> : null}
          </group>;
        })}
      </> : null}
      {/* beat 3: honest misses */}
      {b3 > 0.01 ? <>
        <Axes3D size={TT} origin={TTO} x={{ min: 0, max: 1, ticks: [], title: '' }} y={{ min: 0, max: 8, ticks: [], title: '' }} />
        <Target size={TT} origin={TTO} yFrac={tq(5)} color={C.ink} />
        {[{ r: COLD, x: 0.3, t: 0.69 }, { r: JOIN, x: 0.72, t: 0.72 }].map(({ r, x, t }) => {
          const g = ease((p - t) / 0.05) * reset; const wx = TTO[0] + TT[0] * x, z = TTO[2] - TT[2] * 0.5;
          return <React.Fragment key={x}>
            <Bar size={TT} origin={TTO} xFrac={x} zFrac={0.5} hFrac={tq(r.med) * g} w={0.26} d={0.6} color={r.med <= 5 ? C.green : C.coral} />
            {g > 0.5 ? <Tube points={[[wx, TT[1] * tq(r.lo), z + 0.32], [wx, TT[1] * tq(r.hi), z + 0.32]]} color={C.ink} radius={0.018} /> : null}
          </React.Fragment>;
        })}
        <Axes3D size={CP} origin={CPO} x={{ min: 0, max: 1, ticks: [], title: '' }} y={{ min: 0, max: 20, ticks: [], title: '' }} />
        <Target size={CP} origin={CPO} yFrac={15 / 20} color={C.ink} />
        {CPU.map((c, i) => {
          const g = ease((p - 0.73 - i * 0.02) / 0.05) * reset;
          return <Bar key={c.res} size={CP} origin={CPO} xFrac={0.28 + i * 0.44} zFrac={0.5} hFrac={(c.v / 20) * g} w={0.3} d={0.5} color={c.v <= 15 ? C.green : C.coral} />;
        })}
        {Array.from({ length: MOUTH.n }, (_, i) => {
          const cx = i % 14, cy = Math.floor(i / 14); // 14 x 25 wall, one cube per period
          const g = ease((p - 0.74 - cy * 0.003) / 0.03) * reset; if (g < 0.02) return null;
          const s = 0.088;
          return <mesh key={i} position={[MO[0] + (cx + 0.5) * s, (cy + 0.5) * s * 0.73 * g, MO[2] - 0.3]} scale={[s * 0.82, s * 0.62 * g, 0.2]}>
            <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={i < MOUTH.pass ? C.coral : C.quiet} />
          </mesh>;
        })}
      </> : null}
    </Stage>
  );
};
export default Scene;
