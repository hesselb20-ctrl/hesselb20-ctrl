// Figure kit (v4): 3D evidence figures on a WHITE background with a few simple colours and very little text.
// Self-contained: use only this file (not kit2 / kit3).
// Chart convention: a chart lives in a box of size [sx, sy, sz], origin at its front-left-bottom corner;
// x = first variable (left to right), z = second variable (front to back, drawn towards -z), y = value (up).
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const SANS = "'Inter','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,'Cascadia Mono','Segoe UI Mono',Consolas,monospace";

/**
 * The whole palette: muted, never neon. Use these and nothing else.
 * Fixed meanings: blue = the data / the method at work; amber = the highlight (the thing to look at);
 * green = passes / meets target; coral = fails / misses target; quiet = inactive.
 * The other hues (teal, purple, sand, brown, rose, slate) are for telling categories or series apart:
 * use several of them when the data has groups (bands, layers, sources, stages), so the figure is not two-tone.
 */
export const C = {
  bg: '#FFFFFF',
  ink: '#1F2937',      // text
  mute: '#6B7280',     // secondary text, tick labels
  axis: '#9CA3AF',     // axis lines
  grid: '#E8EAEE',     // grid lines
  quiet: '#D3D8DF',    // inactive / background data
  blue: '#4E79A7',
  sky: '#A0CBE8',
  amber: '#E9A13B',
  orange: '#E9A13B',   // alias of amber (older scenes)
  green: '#6BA368',
  coral: '#D9706B',
  red: '#D9706B',      // alias of coral (older scenes)
  teal: '#5FA8A3',
  purple: '#9B7FB8',
  sand: '#D9C27A',
  brown: '#A68569',
  rose: '#D99AAE',
  slate: '#7C8AA0',
};
/** Category colours in a good order for series 0, 1, 2, ... */
export const SERIES = ['#4E79A7', '#5FA8A3', '#9B7FB8', '#E9A13B', '#6BA368', '#D99AAE', '#A68569', '#7C8AA0', '#D9C27A'];

export const usePhase = () => { const f = useCurrentFrame(); const { durationInFrames } = useVideoConfig(); return f / durationInFrames; };
export const ease = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
/** 1 between a and b, eased over w at both ends. For fading a beat in and out. */
export const span = (p: number, a: number, b: number, w = 0.03) => ease((p - a) / w) * (1 - ease((p - b) / w));
export const rng = (seed: number) => { let a = seed >>> 0; return () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296); };
export const mix = (a: string, b: string, u: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, u))).getHexString();

export type Cam = { position: [number, number, number]; target: [number, number, number]; fov: number };
const build = (cam: Cam, aspect: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, aspect, 0.05, 5000);
  c.position.set(...cam.position); c.lookAt(...cam.target); c.updateMatrixWorld(); c.updateProjectionMatrix();
  return c;
};
/** World point to pixels, for labels that follow geometry while the camera moves. */
export const project = (pt: [number, number, number], cam: Cam, width: number, height: number) => {
  const v = new THREE.Vector3(...pt).project(build(cam, width / height));
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
};
const Rig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera, size } = useThree();
  const c = build(cam, size.width / size.height); const pc = camera as THREE.PerspectiveCamera;
  pc.position.copy(c.position); pc.quaternion.copy(c.quaternion); pc.fov = cam.fov; pc.near = 0.05; pc.far = 5000;
  pc.updateProjectionMatrix(); pc.updateMatrixWorld();
  return null;
};

/** White stage with soft, even light. `overlay` is the 2D layer (labels, caption). Keep the camera move gentle. */
export const Stage: React.FC<{ cam: Cam; overlay?: React.ReactNode; children: React.ReactNode }> = ({ cam, overlay, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }}>
        <color attach="background" args={[C.bg]} />
        <Rig cam={cam} />
        <ambientLight intensity={2.3} />
        <directionalLight position={[-4, 9, 6]} intensity={1.0} />
        <directionalLight position={[6, 4, -5]} intensity={0.3} />
        {children}
      </ThreeCanvas>
      <AbsoluteFill>{overlay}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- axes
export type Axis = { min: number; max: number; ticks: number[]; title: string; fmt?: (v: number) => string; log?: boolean };
export type Box = [number, number, number];
export const norm = (a: Axis, v: number) => a.log ? (Math.log10(v) - Math.log10(a.min)) / (Math.log10(a.max) - Math.log10(a.min)) : (v - a.min) / (a.max - a.min);
type V3 = [number, number, number];

/** Floor grid, back-wall grids and the three axis lines at the tick positions. */
export const Axes3D: React.FC<{ size: Box; x: Axis; y: Axis; z?: Axis; origin?: V3 }> = ({ size, x, y, z, origin = [0, 0, 0] }) => {
  const [sx, sy, sz] = size;
  const geo = useMemo(() => {
    const strong: number[][] = [], faint: number[][] = [];
    const L = (arr: number[][], a: number[], b: number[]) => arr.push(a, b);
    L(strong, [0, 0, 0], [sx, 0, 0]); L(strong, [0, 0, -sz], [0, sy, -sz]); if (z) L(strong, [sx, 0, 0], [sx, 0, -sz]);
    L(faint, [0, 0, 0], [0, 0, -sz]); L(faint, [0, 0, -sz], [sx, 0, -sz]);
    x.ticks.forEach((t) => { const u = norm(x, t) * sx; L(faint, [u, 0, 0], [u, 0, -sz]); L(faint, [u, 0, -sz], [u, sy, -sz]); });
    y.ticks.forEach((t) => { const u = norm(y, t) * sy; L(faint, [0, u, -sz], [sx, u, -sz]); });
    (z?.ticks ?? []).forEach((t) => { const u = norm(z!, t) * sz; L(faint, [0, 0, -u], [sx, 0, -u]); });
    const mk = (a: number[][]) => new THREE.BufferGeometry().setFromPoints(a.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
    return { strong: mk(strong), faint: mk(faint) };
  }, [sx, sy, sz, JSON.stringify(x), JSON.stringify(y), JSON.stringify(z)]);
  return (
    <group position={origin}>
      <lineSegments geometry={geo.faint}><lineBasicMaterial color={C.grid} /></lineSegments>
      <lineSegments geometry={geo.strong}><lineBasicMaterial color={C.axis} /></lineSegments>
    </group>
  );
};

/** Tick labels and short axis titles that follow the camera. Put in the overlay. Keep titles to one or two words. */
export const AxisLabels: React.FC<{ cam: Cam; size: Box; x: Axis; y: Axis; z?: Axis; origin?: V3 }> = ({ cam, size, x, y, z, origin = [0, 0, 0] }) => {
  const { width, height } = useVideoConfig(); const k = width / 960;
  const [sx, sy, sz] = size; const [ox, oy, oz] = origin;
  const P = (a: number, b: number, c: number) => project([ox + a, oy + b, oz + c], cam, width, height);
  const f = (a: Axis, v: number) => (a.fmt ? a.fmt(v) : String(v));
  const tick: React.CSSProperties = { fontFamily: SANS, fontSize: 10.5 * k, color: C.mute, position: 'absolute', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap' };
  const title: React.CSSProperties = { ...tick, color: C.ink, fontWeight: 600, fontSize: 11.5 * k };
  const out: React.ReactNode[] = [];
  x.ticks.forEach((t) => { const q = P(norm(x, t) * sx, 0, 0.08 * sz); out.push(<div key={'x' + t} style={{ ...tick, left: q.x, top: q.y }}>{f(x, t)}</div>); });
  y.ticks.forEach((t) => { const q = P(-0.06 * sx, norm(y, t) * sy, -sz); out.push(<div key={'y' + t} style={{ ...tick, left: q.x, top: q.y }}>{f(y, t)}</div>); });
  (z?.ticks ?? []).forEach((t) => { const q = P(sx * 1.07, 0, -norm(z!, t) * sz); out.push(<div key={'z' + t} style={{ ...tick, left: q.x, top: q.y }}>{f(z!, t)}</div>); });
  if (x.title) { const q = P(sx / 2, 0, 0.2 * sz); out.push(<div key="tx" style={{ ...title, left: q.x, top: q.y }}>{x.title}</div>); }
  if (y.title) { const q = P(-0.06 * sx, sy * 1.1, -sz); out.push(<div key="ty" style={{ ...title, left: q.x, top: q.y }}>{y.title}</div>); }
  if (z && z.title) { const q = P(sx * 1.2, 0, -sz / 2); out.push(<div key="tz" style={{ ...title, left: q.x, top: q.y }}>{z.title}</div>); }
  return <>{out}</>;
};

// ---------------------------------------------------------------- marks
/** A solid bar at (xFrac, zFrac) of the box with height hFrac of the box. `base` raises its foot (for bars below a zero line use base + negative logic yourself). */
export const Bar: React.FC<{ size: Box; xFrac: number; zFrac: number; hFrac: number; base?: number; w?: number; d?: number; color?: string; opacity?: number; origin?: V3 }> = ({ size, xFrac, zFrac, hFrac, base = 0, w = 0.03, d = 0.03, color = C.blue, opacity = 1, origin = [0, 0, 0] }) => {
  const [sx, sy, sz] = size; const h = Math.max(0.0008, hFrac) * sy;
  const g = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <mesh geometry={g} position={[origin[0] + xFrac * sx, origin[1] + base * sy + h / 2, origin[2] - zFrac * sz]} scale={[w * sx, h, d * sz]}>
      <meshLambertMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};

/** Height-field surface from values in 0..1 (rows along z, columns along x). Coloured from `lo` to `hi` by height, with mesh lines. */
export const Surface: React.FC<{ values: number[][]; size: Box; grow?: number; origin?: V3; lo?: string; hi?: string; wire?: string }> = ({ values, size, grow = 1, origin = [0, 0, 0], lo = '#E3EDF6', hi = C.blue, wire = '#3B5B7E' }) => {
  const [sx, sy, sz] = size; const nz = values.length, nx = values[0].length;
  const { mesh, lines } = useMemo(() => {
    const pos: number[] = [], col: number[] = [], idx: number[] = [], ln: number[] = [];
    const a = new THREE.Color(lo), b = new THREE.Color(hi);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      pos.push((i / (nx - 1)) * sx, values[j][i] * grow * sy, -(j / (nz - 1)) * sz);
      const c = a.clone().lerp(b, values[j][i]); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const p = j * nx + i; idx.push(p, p + nx, p + 1, p + 1, p + nx, p + nx + 1); }
    const seg = (p: number, q: number) => ln.push(pos[p * 3], pos[p * 3 + 1] + 0.003, pos[p * 3 + 2], pos[q * 3], pos[q * 3 + 1] + 0.003, pos[q * 3 + 2]);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx - 1; i++) seg(j * nx + i, j * nx + i + 1);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz - 1; j++) seg(j * nx + i, (j + 1) * nx + i);
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); m.setIndex(idx);
    const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(ln, 3));
    return { mesh: m, lines: w };
  }, [values, sx, sy, sz, grow, lo, hi]);
  return (
    <group position={origin}>
      <mesh geometry={mesh}><meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.9} toneMapped={false} /></mesh>
      <lineSegments geometry={lines}><lineBasicMaterial color={wire} transparent opacity={0.35} /></lineSegments>
    </group>
  );
};

/** One curve in the x-y plane at depth zFrac, with a tinted curtain to the floor. ys in 0..1. For waterfalls and ridgelines. */
export const Ridge: React.FC<{ ys: number[]; size: Box; zFrac: number; color?: string; fill?: number; origin?: V3 }> = ({ ys, size, zFrac, color = C.blue, fill = 0.16, origin = [0, 0, 0] }) => {
  const [sx, sy, sz] = size; const n = ys.length;
  const { line, wall } = useMemo(() => {
    const pts = ys.map((y, i) => new THREE.Vector3((i / (n - 1)) * sx, y * sy, -zFrac * sz));
    const pos: number[] = [], idx: number[] = [];
    pts.forEach((q, i) => { pos.push(q.x, q.y, q.z, q.x, 0, q.z); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); } });
    const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); w.setIndex(idx);
    return { line: new THREE.BufferGeometry().setFromPoints(pts), wall: w };
  }, [ys, sx, sy, sz, zFrac]);
  return (
    <group position={origin}>
      {fill ? <mesh geometry={wall}><meshBasicMaterial color={color} transparent opacity={fill} side={THREE.DoubleSide} depthWrite={false} /></mesh> : null}
      <line geometry={line}><lineBasicMaterial color={color} /></line>
    </group>
  );
};

/** A thick line through 3D points (a tube, so it has real width on screen). */
export const Tube: React.FC<{ points: V3[]; color?: string; radius?: number; opacity?: number }> = ({ points, color = C.orange, radius = 0.025, opacity = 1 }) => {
  const g = useMemo(() => points.length < 2 ? null : new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q))), Math.max(8, points.length * 3), radius, 8, false), [JSON.stringify(points), radius]);
  return g ? <mesh geometry={g}><meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} /></mesh> : null;
};

/** A target or limit: a tinted horizontal sheet with a dashed rim at value yFrac. Green/red by convention, or orange. */
export const Target: React.FC<{ size: Box; yFrac: number; color?: string; origin?: V3 }> = ({ size, yFrac, color = C.red, origin = [0, 0, 0] }) => {
  const [sx, sy, sz] = size;
  const rim = useMemo(() => { const g = new THREE.BufferGeometry().setFromPoints([[0, 0], [sx, 0], [sx, -sz], [0, -sz], [0, 0]].map(([a, b]) => new THREE.Vector3(a, 0, b))); return g; }, [sx, sz]);
  return (
    <group position={[origin[0], origin[1] + yFrac * sy, origin[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[sx / 2, 0, -sz / 2]}><planeGeometry args={[sx, sz]} /><meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <line geometry={rim}><lineBasicMaterial color={color} /></line>
    </group>
  );
};

// ---------------------------------------------------------------- text (keep it to a minimum)
/** The only sentence on screen: at most about 8 words. Bottom left. */
export const Caption: React.FC<{ text: string; step?: number; of?: number; opacity?: number }> = ({ text, step, of, opacity = 1 }) => {
  const { width } = useVideoConfig(); const k = width / 960;
  return (
    <div style={{ position: 'absolute', left: 26 * k, bottom: 20 * k, opacity, display: 'flex', alignItems: 'baseline', gap: 12 * k, background: 'rgba(255,255,255,0.88)', padding: `${6 * k}px ${10 * k}px`, borderRadius: 6 * k }}>
      {step ? <div style={{ fontFamily: MONO, fontSize: 12 * k, color: C.mute, letterSpacing: '0.08em' }}>{step}/{of}</div> : null}
      <div style={{ fontFamily: SANS, color: C.ink, fontSize: 23 * k, fontWeight: 650, letterSpacing: '-0.015em' }}>{text}</div>
    </div>
  );
};
/** Small source / status tag, bottom right. One short line: the file or run the numbers come from, and the honest status. */
export const Source: React.FC<{ text: string; opacity?: number }> = ({ text, opacity = 1 }) => {
  const { width } = useVideoConfig(); const k = width / 960;
  return <div style={{ position: 'absolute', right: 28 * k, bottom: 26 * k, opacity, background: 'rgba(255,255,255,0.88)', padding: `${3 * k}px ${6 * k}px`, borderRadius: 4 * k, fontFamily: MONO, fontSize: 10.5 * k, color: C.mute, letterSpacing: '0.04em', textAlign: 'right' }}>{text}</div>;
};
/** Project name, top left. Nothing else goes in the corners. */
export const Name: React.FC<{ text: string }> = ({ text }) => {
  const { width } = useVideoConfig(); const k = width / 960;
  return <div style={{ position: 'absolute', left: 34 * k, top: 24 * k, fontFamily: SANS, fontWeight: 700, fontSize: 15 * k, color: C.ink, letterSpacing: '-0.01em' }}>{text}</div>;
};
/** A value or name pinned to a 3D point (already projected). Use sparingly: only the few marks that carry the point. */
export const Pin: React.FC<{ at: { x: number; y: number }; text: string; color?: string; size?: number; opacity?: number; dy?: number }> = ({ at, text, color = C.ink, size = 12, opacity = 1, dy = -6 }) => {
  const { width } = useVideoConfig(); const k = width / 960;
  return <div style={{ position: 'absolute', left: at.x, top: at.y + dy * k, transform: 'translate(-50%,-100%)', fontFamily: SANS, fontWeight: 700, fontSize: size * k, color, opacity, whiteSpace: 'nowrap' }}>{text}</div>;
};
