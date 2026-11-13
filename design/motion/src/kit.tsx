// Shared kit for portfolio 3D loops. One scene per file in src/scenes/<id>.tsx, default export = component({theme}).
// Rules: monochrome only (use PAL tokens), fixed camera, slow motion, loop must be seamless (drive everything from phase).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type Theme = 'dark' | 'light';
export const MONO = "ui-monospace,'Cascadia Mono','Segoe UI Mono',Consolas,monospace";
export const SANS = "'Inter','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
// bg page, grid floor lines, ink text, mute text, rule lines, accent (pure white / pure black),
// f0/e0 = quietest solid fill and edge, f1/e1 = mid, lo..hi = ramp for data emphasis
export const PAL = {
  dark: { bg: '#0A0A0A', grid: '#181818', ink: '#EDEDED', mute: '#8C8C8C', rule: '#2B2B2B', accent: '#FFFFFF',
    f0: '#0F0F0F', e0: '#262626', f1: '#161616', e1: '#444444', lo: '#222222', hi: '#FFFFFF' },
  light: { bg: '#F5F5F5', grid: '#E6E6E6', ink: '#111111', mute: '#5F5F5F', rule: '#C8C8C8', accent: '#000000',
    f0: '#F0F0F0', e0: '#D2D2D2', f1: '#E4E4E4', e1: '#A6A6A6', lo: '#D4D4D4', hi: '#000000' },
};
export type Pal = (typeof PAL)['dark'];

/** Loop phase in [0,1). Use sin/cos of 2*PI*k*phase with integer k so the last frame meets the first. */
export const usePhase = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return f / durationInFrames;
};

export type Cam = { position: [number, number, number]; target: [number, number, number]; fov: number };
export const makeCamera = (cam: Cam, aspect: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, aspect, 0.1, 20000);
  c.position.set(...cam.position);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
};
/** Project a world point to pixel coordinates with the same camera the canvas uses (for 2D labels and leaders). */
export const toScreen = (p: [number, number, number], cam: Cam, width: number, height: number) => {
  const v = new THREE.Vector3(...p).project(makeCamera(cam, width / height));
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
};
const Rig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera, size } = useThree();
  const c = makeCamera(cam, size.width / size.height);
  const pc = camera as THREE.PerspectiveCamera;
  pc.position.copy(c.position);
  pc.quaternion.copy(c.quaternion);
  pc.fov = cam.fov;
  pc.near = 0.1;
  pc.far = 20000;
  pc.updateProjectionMatrix();
  pc.updateMatrixWorld();
  return null;
};

/** Canvas + lights + optional floor grid; overlay is 2D React drawn on top (labels). Keep the camera FIXED. */
export const Stage: React.FC<{
  theme: Theme; cam: Cam; grid?: { size: number; divisions: number; y?: number } | false;
  overlay?: React.ReactNode; children: React.ReactNode;
}> = ({ theme, cam, grid, overlay, children }) => {
  const pal = PAL[theme];
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <ThreeCanvas width={width} height={height} linear flat>
        <Rig cam={cam} />
        <ambientLight intensity={theme === 'dark' ? 1.5 : 2.7} />
        <directionalLight position={[-6, 9, 5]} intensity={theme === 'dark' ? 1.3 : 0.9} />
        {grid ? <gridHelper args={[grid.size, grid.divisions, pal.grid, pal.grid]} position={[0, grid.y ?? 0, 0]} /> : null}
        {children}
      </ThreeCanvas>
      <AbsoluteFill>{overlay}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Small-caps mono label style. Scale sizes with k = width / 800. */
export const labelStyle = (pal: Pal, k: number): React.CSSProperties => ({
  fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 10.5 * k,
  color: pal.mute, lineHeight: 1.7, whiteSpace: 'nowrap',
});

/** A solid with crisp technical edges: pass any BufferGeometry. */
export const Solid: React.FC<{
  geometry: THREE.BufferGeometry; fill: string; edge: string; edgeOpacity?: number;
  position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number];
}> = ({ geometry, fill, edge, edgeOpacity = 1, ...rest }) => {
  const edges = React.useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);
  return (
    <group {...rest}>
      <mesh geometry={geometry}><meshLambertMaterial color={fill} /></mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color={edge} transparent opacity={edgeOpacity} /></lineSegments>
    </group>
  );
};
export const mix = (a: string, b: string, u: number) =>
  '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, u))).getHexString();
