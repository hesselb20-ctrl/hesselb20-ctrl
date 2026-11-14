// caliper: one figure, three beats, white background. The chart is the part itself.
// Claim: from ONE known measurement (hole spacing 40 mm), caliper recovers every other dimension of the part
//        within a fraction of a millimetre: 13 of 14 scored dimensions within +-0.25 mm, mean |error| 0.09 mm.
// 1. One dimension is known: the 40 mm hole spacing (amber) on the recovered solid, everything else grey.
//    Solid: examples/bracket/out/part.stl (2824 triangles) via public/caliper-part.json (STL coords, mm).
//    Reference: examples/bracket/accuracy.json summary.reference = "hole spacing 40mm".
// 2. The other 14 dimensions resolve one by one, each feature tinted (plate, fillets, holes, slot, flange).
//    Features and placements: examples/bracket/out/feature_tree.json + params.json (holes x=+-20 y=-8, slot y=8,
//    flange on +y edge, flange holes u=+-22 v=26). Part geometry checked against ground_truth.py.
// 3. Proof: 15 lollipops, error = measured_mm - truth_mm (accuracy.json rows[].error_mm, raw before snapping,
//    sign as stored: + = measured too large). Target +-0.25 mm = half of caliper's 0.5 mm snap grid (README step 5):
//    inside it the snap lands on the true value. Flange height +0.474 misses it (coral; README notes it snapped
//    to 40.5). Reference row is 0 by construction (amber, not scored). Mean |error| 0.091 mm = summary.mean_abs_error_mm.
//    Honest status: one synthetic part, photos rendered from ground_truth.py, no real photos tested.
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, Axes3D, AxisLabels, Tube, Target, Caption, Source, Name, Pin, C, usePhase, project, ease, span, norm, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type Part = { v: number[]; i: number[] };
type V3 = [number, number, number];
// STL (x, y, z) in mm -> world: x right, z up, y away from the viewer; 1 unit = 10 mm
const W = (x: number, y: number, z: number): V3 => [x / 10, z / 10, -y / 10];

type Feat = 'plate' | 'fillet' | 'hole' | 'slot' | 'flange';
const HUE: Record<Feat, string> = { plate: C.blue, fillet: C.brown, hole: C.purple, slot: C.rose, flange: C.teal };
const FEATS: Feat[] = ['plate', 'fillet', 'hole', 'slot', 'flange'];

// accuracy.json rows (error_mm = measured - truth), in chart order grouped by feature.
// a, b = dimension line ends in STL mm; t = tick direction.
type Dim = { key: string; f: Feat | 'ref'; err: number; a: V3; b: V3; t: V3 };
const DIMS: Dim[] = [
  { key: 'length', f: 'plate', err: 0.055, a: [-40, -32, 0], b: [40, -32, 0], t: [0, 1, 0] },
  { key: 'width', f: 'plate', err: 0.14, a: [47, -25, 0], b: [47, 25, 0], t: [1, 0, 0] },
  { key: 'thickness', f: 'plate', err: 0.059, a: [-46, -12, 0], b: [-46, -12, 5], t: [0, 1, 0] },
  { key: 'corner_radius', f: 'fillet', err: 0.134, a: [34, -19, 5.3], b: [38.24, -23.24, 5.3], t: [0.707, -0.707, 0] },
  { key: 'hole_diameter', f: 'hole', err: -0.018, a: [-20, -11.25, 5.3], b: [-20, -4.75, 5.3], t: [1, 0, 0] },
  { key: 'hole_y', f: 'hole', err: 0.045, a: [27, 0, 5.3], b: [27, -8, 5.3], t: [1, 0, 0] },
  { key: 'hole_spacing', f: 'ref', err: 0, a: [-20, -8, 5.4], b: [20, -8, 5.4], t: [0, 1, 0] },
  { key: 'slot_length', f: 'slot', err: -0.046, a: [-7, 12.5, 5.3], b: [7, 12.5, 5.3], t: [0, 1, 0] },
  { key: 'slot_width', f: 'slot', err: 0.009, a: [10, 5.5, 5.3], b: [10, 10.5, 5.3], t: [1, 0, 0] },
  { key: 'slot_y', f: 'slot', err: 0.063, a: [-11, 0, 5.3], b: [-11, 8, 5.3], t: [1, 0, 0] },
  { key: 'flange_height', f: 'flange', err: 0.474, a: [-46, 25, 0], b: [-46, 25, 40.5], t: [0, 1, 0] },
  { key: 'flange_thickness', f: 'flange', err: 0.059, a: [-34, 20, 44], b: [-34, 25, 44], t: [0, 0, 1] },
  { key: 'flange_hole_diameter', f: 'hole', err: -0.035, a: [22, 19.4, 23.5], b: [22, 19.4, 28.5], t: [1, 0, 0] },
  { key: 'flange_hole_spacing', f: 'hole', err: -0.045, a: [-22, 19.4, 33], b: [22, 19.4, 33], t: [0, 0, 1] },
  { key: 'flange_hole_height', f: 'hole', err: 0.099, a: [-30, 19.4, 5], b: [-30, 19.4, 26], t: [1, 0, 0] },
];
const TOL = 0.25;
const MEAN_ABS = 0.091;
const scored = DIMS.filter((d) => d.f !== 'ref');
const inside = scored.filter((d) => Math.abs(d.err) <= TOL).length;
const worst = scored.reduce((m, d) => (Math.abs(d.err) > Math.abs(m.err) ? d : m));
const colOf = (d: Dim) => (d.f === 'ref' ? C.amber : HUE[d.f]);
// reveal order in beat 2: the chart order, reference skipped
const ORDER = DIMS.map((d, i) => i).filter((i) => DIMS[i].f !== 'ref');

// chart beside the part
const CH: Box = [5.4, 4.0, 0.9];
const CO: V3 = [5.5, 0.1, 0.45];

const camAt = (p: number): Cam => {
  const proof = span(p, 0.655, 0.955, 0.04);
  const az = -0.38 + 0.12 * Math.sin(TAU * p) + 0.36 * proof;
  const R = 20 + 1.4 * proof, el = 0.5 - 0.2 * proof;
  const tx = 0.1 + 3.15 * proof, ty = 1.0 + 1.25 * proof;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), ty + R * Math.sin(el), R * Math.cos(el) * Math.cos(az)], target: [tx, ty, 0], fov: 27 };
};

const classify = (c: number[], n: number[]): Feat => {
  const [x, y, z] = c; const wall = Math.abs(n[2]) < 0.3;
  if (y > 19.6 && Math.abs(Math.hypot(Math.abs(x) - 22, z - 26)) < 3.0 && Math.abs(n[1]) < 0.3) return 'hole';
  if (z < 5.05 && wall && Math.hypot(Math.abs(x) - 20, y + 8) < 3.6) return 'hole';
  if (z < 5.05 && wall && Math.abs(y - 8) < 2.9 && Math.abs(x) < 7.4) return 'slot';
  if (wall && Math.abs(x) > 33.8 && y < -18.8 && Math.abs(n[0]) > 0.04 && Math.abs(n[1]) > 0.04) return 'fillet';
  if (y > 20.0 - 1e-6 && (z > 5.05 || y > 20.01)) return 'flange';
  return 'plate';
};

const Solid: React.FC<{ part: Part; tint: Record<Feat, number>; p3: number }> = ({ part, tint }) => {
  const geos = useMemo(() => {
    const buckets: Record<Feat, number[]> = { plate: [], fillet: [], hole: [], slot: [], flange: [] };
    const v = part.v, I = part.i;
    for (let t = 0; t < I.length; t += 3) {
      const P = [0, 1, 2].map((k) => [v[I[t + k] * 3], v[I[t + k] * 3 + 1], v[I[t + k] * 3 + 2]]);
      const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const L = Math.hypot(n[0], n[1], n[2]) || 1; const nn = n.map((q) => q / L);
      const c = [0, 1, 2].map((k) => (P[0][k] + P[1][k] + P[2][k]) / 3);
      buckets[classify(c, nn)].push(...P.flat());
    }
    const out = {} as Record<Feat, THREE.BufferGeometry>;
    FEATS.forEach((f) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(buckets[f], 3)); g.computeVertexNormals(); out[f] = g; });
    const all = new THREE.BufferGeometry(); all.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); all.setIndex(I);
    return { out, edges: new THREE.EdgesGeometry(all, 28) };
  }, [part]);
  const grey = '#E3E6EB';
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} scale={0.1}>
      {FEATS.map((f) => (
        <mesh key={f} geometry={geos.out[f]}>
          <meshLambertMaterial color={mix(grey, mix(HUE[f], '#FFFFFF', f === 'plate' ? 0.55 : 0.3), tint[f])} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
      ))}
      <lineSegments geometry={geos.edges}><lineBasicMaterial color="#8A93A2" transparent opacity={0.55} /></lineSegments>
    </group>
  );
};

// a dimension line with end ticks, grown from its middle by g in 0..1
const DimLine: React.FC<{ d: Dim; g: number; color: string; r?: number }> = ({ d, g, color, r = 0.022 }) => {
  if (g < 0.02) return null;
  const A = W(...d.a), B = W(...d.b); const M = A.map((q, k) => (q + B[k]) / 2);
  const a = A.map((q, k) => M[k] + (q - M[k]) * g) as V3, b = B.map((q, k) => M[k] + (q - M[k]) * g) as V3;
  const T = W(...d.t); const tl = 0.11 * ease((g - 0.6) / 0.4);
  const tick = (o: V3) => [o.map((q, k) => q - T[k] * tl) as V3, o.map((q, k) => q + T[k] * tl) as V3];
  return <>
    <Tube points={[a, b]} color={color} radius={r} />
    {tl > 0.01 ? <><Tube points={tick(a)} color={color} radius={r} /><Tube points={tick(b)} color={color} radius={r} /></> : null}
  </>;
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [part, setPart] = React.useState<Part | null>(null);
  const [h] = React.useState(() => delayRender('caliper'));
  React.useEffect(() => { fetch(staticFile('caliper-part.json')).then((r) => r.json()).then((j) => { setPart(j); continueRender(h); }); }, [h]);
  if (!part) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const P = (q: V3) => project(q, cam, width, height);
  const reset = 1 - ease((p - 0.955) / 0.04);
  const b3 = span(p, 0.67, 0.955, 0.04);
  // beat 2: dimension k of 14 appears at t_k
  const tOf = (rank: number) => 0.35 + rank * 0.019;
  const grow = (i: number) => {
    if (DIMS[i].f === 'ref') return ease((p - 0.04) / 0.06) * reset;
    return ease((p - tOf(ORDER.indexOf(i))) / 0.035) * reset;
  };
  const tint = {} as Record<Feat, number>;
  FEATS.forEach((f) => { const first = Math.min(...ORDER.filter((i) => DIMS[i].f === f).map((i) => ORDER.indexOf(i))); tint[f] = ease((p - tOf(first)) / 0.05) * reset; });

  const ay: Axis = { min: -0.5, max: 0.5, ticks: [-0.5, -0.25, 0, 0.25, 0.5], title: 'error mm', fmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) };
  const ax: Axis = { min: 0, max: 15, ticks: [], title: 'dimension' };
  const yAt = (e: number) => CO[1] + norm(ay, e) * CH[1];
  const xAt = (i: number) => CO[0] + ((i + 0.5) / 15) * CH[0];
  const zMid = CO[2] - CH[2] / 2;
  const pop = (i: number) => ease((p - 0.70 - i * 0.012) / 0.04) * reset;
  const passCol = (d: Dim) => (d.f === 'ref' ? C.amber : Math.abs(d.err) <= TOL ? C.green : C.coral);

  const refMid = W(0, -8, 5.4);
  const wi = DIMS.indexOf(worst);
  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="caliper" />
        <Pin at={P(refMid)} text="40 mm" color={C.amber} size={15} dy={-4} opacity={ease((p - 0.06) / 0.04) * reset} />
        {b3 > 0.02 ? <div style={{ opacity: b3 }}>
          <AxisLabels cam={cam} size={CH} origin={CO} x={ax} y={ay} />
          <Pin at={P([CO[0] + CH[0] + 1.1, yAt(TOL), CO[2] - CH[2] / 2])} text="½ snap grid" color={C.green} size={11.5} dy={7} />
          <Pin at={P([xAt(wi), yAt(worst.err), zMid])} text={`+${worst.err.toFixed(2)} flange`} color={C.coral} size={13} dy={-10} opacity={pop(wi)} />
          <Pin at={P([CO[0] + CH[0] + 1.3, yAt(MEAN_ABS), zMid])} text="mean |err| 0.09" color={C.slate} size={11} dy={7} opacity={ease((p - 0.86) / 0.04)} />
        </div> : null}
        <Caption step={1} of={3} opacity={c1} text="One known measurement: 40 mm." />
        <Source opacity={c1} text="examples/bracket · reference: hole spacing 40 mm" />
        <Caption step={2} of={3} opacity={c2} text="Every other dimension follows from it." />
        <Source opacity={c2} text="out/params.json · 5 features · 14 dimensions" />
        <Caption step={3} of={3} opacity={c3} text={`${inside} of ${scored.length} within half the snap grid.`} />
        <Source opacity={c3} text="band: ½ of 0.5 mm grid, not a spec · 1 rendered part" />
      </>}>
      <Solid part={part} tint={tint} p3={b3} />
      {DIMS.map((d, i) => {
        const g = grow(i);
        const col = d.f === 'ref' ? C.amber : mix(HUE[d.f], C.coral, Math.abs(d.err) > TOL ? b3 : 0);
        return <DimLine key={d.key} d={d} g={g} color={col} r={d.f === 'ref' ? 0.03 : 0.022} />;
      })}
      {b3 > 0.02 ? <group>
        <Axes3D size={CH} origin={CO} x={ax} y={ay} />
        <Target size={CH} origin={CO} yFrac={norm(ay, TOL)} color={C.green} />
        <Target size={CH} origin={CO} yFrac={norm(ay, -TOL)} color={C.green} />
        <Tube points={[[CO[0], yAt(0), zMid], [CO[0] + CH[0], yAt(0), zMid]]} color={C.axis} radius={0.012} />
        <Tube points={[[CO[0], yAt(MEAN_ABS), zMid], [CO[0] + CH[0] * ease((p - 0.86) / 0.05), yAt(MEAN_ABS), zMid]]} color={C.slate} radius={0.01} />
        {DIMS.map((d, i) => {
          const u = pop(i); if (u < 0.02) return null;
          const x = xAt(i), y = yAt(d.err * u), col = passCol(d);
          return <React.Fragment key={d.key}>
            {/* feature key tile on the floor of the chart */}
            <mesh position={[x, CO[1] + 0.02, zMid]}><boxGeometry args={[0.2, 0.04, 0.3]} /><meshLambertMaterial color={colOf(d)} /></mesh>
            {Math.abs(y - yAt(0)) > 0.01 ? <Tube points={[[x, yAt(0), zMid], [x, y, zMid]]} color={col} radius={0.03} /> : null}
            <mesh position={[x, y, zMid]}><sphereGeometry args={[d.f === 'ref' ? 0.1 : 0.09, 18, 12]} /><meshLambertMaterial color={col} /></mesh>
          </React.Fragment>;
        })}
      </group> : null}
    </Stage>
  );
};
export default Scene;
