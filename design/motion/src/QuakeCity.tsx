import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type B = { r: [number, number][]; s: number; st: 0 | 1 | 2; sc?: number; lo?: number; hi?: number; f1?: number };

const MONO = "ui-monospace,'Cascadia Mono','Segoe UI Mono',Consolas,monospace";
const SEG = 4; // storeys drawn per slab of the featured building
const STOREY = 3.6; // metres per storey, drawing assumption
export const PALETTES = {
  dark: { bg: '#0A0A0A', grid: '#181818', ink: '#EDEDED', mute: '#8C8C8C', rule: '#2B2B2B', accent: '#FFFFFF',
    f0: '#0F0F0F', e0: '#262626', f1: '#161616', e1: '#444444', lo: '#222222', hi: '#FFFFFF' },
  light: { bg: '#F5F5F5', grid: '#E6E6E6', ink: '#111111', mute: '#5F5F5F', rule: '#C8C8C8', accent: '#000000',
    f0: '#F0F0F0', e0: '#D2D2D2', f1: '#E4E4E4', e1: '#A6A6A6', lo: '#D4D4D4', hi: '#000000' },
};

const shapeOf = (r: [number, number][]) => {
  const s = new THREE.Shape();
  r.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
};
const extrude = (r: [number, number][], h: number) => {
  const g = new THREE.ExtrudeGeometry(shapeOf(r), { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // footprint on the ground, height along +Y
  return g;
};

// Camera is a pure function of loop phase so the 2D label can be projected with the same maths.
const FOV = 26;
const cameraAt = (phase: number, aspect: number) => {
  const az = -0.62; // fixed camera: a moving one makes the loop ten times heavier
  const R = 2500, el = 0.46;
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 10, 8000);
  cam.position.set(R * Math.cos(el) * Math.sin(az), R * Math.sin(el), R * Math.cos(el) * Math.cos(az));
  cam.lookAt(0, 30, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

const Rig: React.FC<{ phase: number }> = ({ phase }) => {
  const { camera, size } = useThree();
  const c = cameraAt(phase, size.width / size.height);
  camera.position.copy(c.position);
  camera.quaternion.copy(c.quaternion);
  (camera as THREE.PerspectiveCamera).fov = FOV;
  (camera as THREE.PerspectiveCamera).near = 10;
  (camera as THREE.PerspectiveCamera).far = 8000;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return null;
};

const centroid = (r: [number, number][]) => [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];

const City: React.FC<{ data: B[]; pal: (typeof PALETTES)['dark']; phase: number; hero: number }> = ({ data, pal, phase, hero }) => {
  const geo = useMemo(() => data.map((b, i) => {
    if (i === hero) return null;
    const g = extrude(b.r, b.s * STOREY);
    return { g, e: new THREE.EdgesGeometry(g, 20) };
  }), [data, hero]);
  const heroFloors = useMemo(() => {
    const g = extrude(data[hero].r, STOREY * SEG);
    return { g, e: new THREE.EdgesGeometry(g, 20) };
  }, [data, hero]);
  const lo = new THREE.Color(pal.lo), hi = new THREE.Color(pal.hi);
  const hb = data[hero];
  const swayCycles = 4; // whole cycles per loop keeps the loop seamless
  return (
    <>
      {data.map((b, i) => {
        const G = geo[i];
        if (!G) return null;
        let fill = pal.f0, edge = pal.e0, op = 1;
        if (b.st === 1) { fill = pal.f1; edge = pal.e1; }
        if (b.st === 2) {
          // a slow wave crosses the district; scored buildings brighten as it passes
          const x = centroid(b.r)[0] / 760;
          const w = Math.max(0, Math.cos(2 * Math.PI * (phase - 0.5 * x))) ** 6;
          const vuln = 1 - (b.sc ?? 50) / 100; // more vulnerable = stronger accent
          const c = lo.clone().lerp(hi, Math.min(1, 0.04 + 0.9 * vuln + 0.16 * w));
          fill = '#' + c.getHexString(); edge = pal.hi; op = 0.28 + 0.6 * w;
        }
        return (
          <group key={i}>
            <mesh geometry={G.g}><meshLambertMaterial color={fill} /></mesh>
            <lineSegments geometry={G.e}><lineBasicMaterial color={edge} transparent opacity={b.st === 2 ? op : 1} /></lineSegments>
          </group>
        );
      })}
      {Array.from({ length: Math.ceil(hb.s / SEG) }, (_, k) => {
        // first-mode shape of a shear building: displacement grows with height (exaggerated)
        const u = (k + 1) / Math.ceil(hb.s / SEG);
        const dx = 20 * Math.sin((Math.PI / 2) * u) * Math.sin(2 * Math.PI * swayCycles * phase);
        return (
          <group key={'h' + k} position={[dx, k * STOREY * SEG, 0]}>
            <mesh geometry={heroFloors.g}><meshLambertMaterial color={pal.hi} /></mesh>
            <lineSegments geometry={heroFloors.e}><lineBasicMaterial color={pal.bg} /></lineSegments>
          </group>
        );
      })}
    </>
  );
};

export const QuakeCity: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const pal = PALETTES[theme];
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const phase = frame / durationInFrames;
  const [data, setData] = React.useState<B[] | null>(null);
  const [handle] = React.useState(() => delayRender('city'));
  React.useEffect(() => {
    fetch(staticFile('quake-city.json')).then((r) => r.json()).then((d) => { setData(d); continueRender(handle); });
  }, [handle]);
  const hero = useMemo(() => {
    if (!data) return -1;
    // the tallest scored building up to 55 storeys, so its top is never hidden
    let best = -1, bs = 0;
    data.forEach((b, i) => { if (b.st === 2 && b.s <= 55 && b.s > bs) { bs = b.s; best = i; } });
    return best;
  }, [data]);
  if (!data) return <AbsoluteFill style={{ background: pal.bg }} />;
  const hb = data[hero];
  const [hx, hy] = centroid(hb.r);
  const top = new THREE.Vector3(hx, hb.s * STOREY, -hy).project(cameraAt(phase, width / height));
  const px = (top.x * 0.5 + 0.5) * width, py = (-top.y * 0.5 + 0.5) * height;
  const counts = [0, 1, 2].map((s) => data.filter((b) => b.st === s).length);
  const k = width / 800;
  const label: React.CSSProperties = { fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 10.5 * k, color: pal.mute, lineHeight: 1.7 };
  const lx = px + 90 * k, ly = py - 62 * k;
  const sw = (c: string, b: string) => <span style={{ display: 'inline-block', width: 9 * k, height: 9 * k, background: c, border: `1px solid ${b}`, marginRight: 7 * k, verticalAlign: 'middle' }} />;
  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <ThreeCanvas width={width} height={height} linear flat>
        <Rig phase={phase} />
        <ambientLight intensity={theme === 'dark' ? 1.5 : 2.7} />
        <directionalLight position={[-600, 900, 500]} intensity={theme === 'dark' ? 1.3 : 0.9} />
        <gridHelper args={[2400, 30, pal.grid, pal.grid]} position={[0, -0.5, 0]} />
        <City data={data} pal={pal} phase={phase} hero={hero} />
      </ThreeCanvas>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <path d={`M${px} ${py - 4 * k}L${lx - 12 * k} ${ly + 30 * k}H${lx + 236 * k}`} fill="none" stroke={pal.accent} strokeWidth={1 * k} />
        <circle cx={px} cy={py - 4 * k} r={3 * k} fill={pal.accent} />
      </svg>
      <div style={{ ...label, position: 'absolute', left: lx, top: ly - 34 * k, color: pal.ink }}>
        <div style={{ color: pal.accent }}>Simulated record</div>
        <div style={{ whiteSpace: 'nowrap' }}>{hb.s} storeys · first mode {hb.f1!.toFixed(2)} Hz</div>
        <div>Score {Math.round(hb.sc!)} · band {Math.round(hb.lo!)}–{Math.round(hb.hi!)}</div>
      </div>
      <div style={{ ...label, position: 'absolute', left: 28 * k, top: 22 * k }}>
        <div style={{ color: pal.ink }}>Demo district · downtown San Francisco</div>
        <div>{data.length} OpenStreetMap footprints · simulated scores</div>
      </div>
      <div style={{ ...label, position: 'absolute', left: 28 * k, bottom: 20 * k }}>
        <div>{sw(pal.hi, pal.hi)}Scored {counts[2]} <span style={{ opacity: 0.6 }}>· stronger tone = more vulnerable</span></div>
        <div>{sw(pal.f1, pal.e1)}Needs data {counts[1]}</div>
        <div>{sw(pal.f0, pal.e0)}No data {counts[0]}</div>
      </div>
      <div style={{ ...label, position: 'absolute', right: 28 * k, bottom: 20 * k, textAlign: 'right' }}>Sway exaggerated</div>
    </AbsoluteFill>
  );
};
