// quakescore-city: one continuous shot, white background.
// Claim: in the simulated demo district, phones get tall buildings scored first; low-rise mostly lacks data.
// Data: public/quake-city2.json, converted from quakescore dashboard/data/buildings.geojson:
//   687 REAL OpenStreetMap footprints (downtown San Francisco, ODbL) with storeys (95 untagged ones taken as 1 storey),
//   status scored / needs_data / no_data, and for scored buildings the SIMULATED score (100 = least vulnerable,
//   DESIGN.md section 6), its 5-95% band and the identified first-mode frequency f1.
//   Counts 222 / 255 / 210 and "scored by height: 7 of 231 at 1-3 storeys, 55 of 56 at 30+" match
//   results/demo_city_summary.md. Simulated scores on real footprints are NOT assessments of those buildings.
// Geometry as in src/QuakeCity.tsx: footprint in metres, extruded by storeys x 3.6 m (drawing assumption).
// Colour: scored = coral (more vulnerable, low score) -> sand -> teal (least vulnerable); needs data = quiet
// blue-grey; no data = very light grey; the featured building is amber (the highlight).
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, Caption, Source, Name, C, usePhase, project, ease, mix, TAU, SANS, type Cam } from '../kit4';

type B = { r: [number, number][]; s: number; st: 0 | 1 | 2; sc?: number; lo?: number; hi?: number; f1?: number };
const STOREY = 3.6;
const S = 0.01; // world scale (metres -> 1/100) so the kit's near/far planes keep enough depth precision
const NEED = mix(C.slate, '#FFFFFF', 0.42);
const NONE = '#EEF0F3';
const MID = mix(C.sand, '#FFFFFF', 0.35);
// 50 -> coral, 75 -> pale sand, 100 -> teal (diverging, so no orange appears to compete with the amber highlight)
const scoreCol = (sc: number) => { const u = Math.max(0, Math.min(1, (sc - 50) / 50)); return u < 0.5 ? mix(C.coral, MID, u * 2) : mix(MID, C.teal, (u - 0.5) * 2); };
const centroid = (r: [number, number][]) => [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length] as [number, number];

const camAt = (p: number): Cam => {
  const az = -0.62 + 0.05 * Math.sin(TAU * p);
  const R = 2900, el = 0.52 + 0.015 * Math.cos(TAU * p);
  return { position: [S * R * Math.cos(el) * Math.sin(az), S * R * Math.sin(el), S * R * Math.cos(el) * Math.cos(az)], target: [S * 20, S * -60, S * -40], fov: 26 };
};

const shapeOf = (r: [number, number][]) => { const s = new THREE.Shape(); r.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
const extrude = (r: [number, number][], h: number) => { const g = new THREE.ExtrudeGeometry(shapeOf(r), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; };

const Tag: React.FC<{ at: { x: number; y: number }; text: React.ReactNode; color: string; size?: number; opacity?: number; dy?: number }> = ({ at, text, color, size = 13, opacity = 1, dy = -8 }) => {
  const { width } = useVideoConfig(); const k = width / 960; const h = 2.2 * k;
  return <div style={{ position: 'absolute', left: at.x, top: at.y + dy * k, transform: 'translate(-50%,-100%)', fontFamily: SANS, fontWeight: 700, fontSize: size * k, color, opacity, whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2,
    textShadow: `0 0 ${h}px #fff, 0 0 ${h}px #fff, 0 0 ${2 * h}px #fff, ${h}px 0 #fff, -${h}px 0 #fff, 0 ${h}px #fff, 0 -${h}px #fff` }}>{text}</div>;
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [data, setData] = React.useState<B[] | null>(null);
  const [hd] = React.useState(() => delayRender('quake-city2'));
  React.useEffect(() => { fetch(staticFile('quake-city2.json')).then((r) => r.json()).then((j) => { setData(j.b); continueRender(hd); }); }, [hd]);
  const geo = useMemo(() => data ? data.map((b) => { const g = extrude(b.r, Math.max(1, b.s) * STOREY); return { g, e: new THREE.EdgesGeometry(g, 25) }; }) : null, [data]);
  const picks = useMemo(() => {
    if (!data) return null;
    const cam = camAt(0); const P = (x: number, y: number, z: number) => project([S * x, S * y, S * z], cam, width, height);
    const info = data.map((b, i) => { const [cx, cy] = centroid(b.r); const q = P(cx, b.s * STOREY, -cy); return { i, cx, cy, q, s: b.s, st: b.st }; });
    const inFrame = (q: { x: number; y: number }, x0: number, x1: number, y0: number, y1: number) => q.x > x0 * width && q.x < x1 * width && q.y > y0 * height && q.y < y1 * height;
    // featured: a mid-height scored building with a below-median score, near the front of the shot, chosen from the data
    const hero = info.filter((o) => o.st === 2 && o.s >= 16 && o.s <= 40 && (data[o.i].sc ?? 100) < 86 && inFrame(o.q, 0.3, 0.7, 0.2, 0.8)).sort((a, b) => b.q.y - a.q.y)[0].i;
    const best = (st: number, x0: number, x1: number, y0: number, y1: number, minS: number, maxS: number) => info.filter((o) => o.st === st && o.s >= minS && o.s <= maxS && inFrame(o.q, x0, x1, y0, y1)).sort((a, b) => b.q.y - a.q.y)[0]?.i ?? -1;
    return { hero, scored: best(2, 0.62, 0.8, 0.1, 0.55, 40, 70), need: best(1, 0.12, 0.3, 0.2, 0.75, 4, 10), none: best(0, 0.74, 0.9, 0.35, 0.6, 1, 3) };
  }, [data, width, height]);
  if (!data || !geo || !picks) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const reset = 1 - ease((p - 0.955) / 0.04);
  const counts = [0, 1, 2].map((s) => data.filter((b) => b.st === s).length);
  const top = (i: number) => { const [cx, cy] = centroid(data[i].r); return project([S * cx, S * data[i].s * STOREY, -S * cy], cam, width, height); };
  const pinOn = ease((p - 0.2) / 0.05) * (1 - ease((p - 0.93) / 0.03));
  const hb = data[picks.hero];
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="quakescore" />
        <Tag at={top(picks.hero)} color={C.amber} size={12.5} opacity={pinOn} dy={-10}
          text={<>{hb.s} storeys · {hb.f1!.toFixed(2)} Hz<br />score {Math.round(hb.sc!)} <span style={{ fontWeight: 500 }}>({Math.round(hb.lo!)}–{Math.round(hb.hi!)})</span></>} />
        {picks.scored >= 0 ? <Tag at={top(picks.scored)} color={mix(C.teal, C.ink, 0.25)} opacity={pinOn} text={`${counts[2]} scored`} /> : null}
        {picks.need >= 0 ? <Tag at={top(picks.need)} color={C.slate} opacity={pinOn} text={`${counts[1]} need data`} /> : null}
        {picks.none >= 0 ? <Tag at={top(picks.none)} color={C.mute} opacity={pinOn} text={`${counts[0]} no data`} /> : null}
        <Caption text="Tall buildings score first; low-rise lacks data." opacity={1} />
        <Source text="687 real OSM footprints · simulated scores · 0 real sessions" />
      </>}>
      <group scale={[S, S, S]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}><planeGeometry args={[1600, 1520]} /><meshBasicMaterial color="#F6F7F9" /></mesh>
      {data.map((b, i) => {
        const [cx, cy] = centroid(b.r);
        const d = Math.hypot(cx, cy) / 1050;
        const grow = Math.max(0.01, ease((p - 0.01 - d * 0.1) / 0.07) * reset);
        const isHero = i === picks.hero;
        const fill = isHero ? C.amber : b.st === 2 ? scoreCol(b.sc ?? 75) : b.st === 1 ? NEED : NONE;
        const edge = mix(fill, C.ink, b.st === 0 && !isHero ? 0.14 : 0.28);
        return (
          <group key={i} scale={[1, grow, 1]}>
            <mesh geometry={geo[i].g}><meshLambertMaterial color={fill} /></mesh>
            <lineSegments geometry={geo[i].e}><lineBasicMaterial color={edge} transparent opacity={0.55} /></lineSegments>
          </group>
        );
      })}
      </group>
    </Stage>
  );
};
export default Scene;
