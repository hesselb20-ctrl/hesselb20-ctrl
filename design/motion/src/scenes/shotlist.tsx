// shotlist: the committed analysis of the bundled test clip (samples/test-clip.shotlist.json) as a 3D edit timeline.
// Slabs = the 9 detected shots, length = real frame count, tone = measured dominantColor converted to luminance.
// Posts = the 29 detected audio onsets at their real frames, height = onset strength.
// Ticks = cuts; filled when shotlist marked the cut on the beat (cutOnBeat), hollow ring when off.
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

// [startFrame, endFrame, dominantColor, cutOnBeat] copied from samples/test-clip.shotlist.json
const SHOTS: [number, number, string, boolean][] = [
  [0, 45, '#69676b', false], [45, 90, '#7b837e', true], [90, 114, '#253125', true],
  [114, 150, '#666666', false], [150, 189, '#848284', true], [189, 240, '#788085', false],
  [240, 300, '#5f5e60', true], [300, 360, '#7f7f7f', true], [360, 450, '#5d189f', true],
];
// [frame, strength] of beats.onsets in the same file
const ONSETS: [number, number][] = [
  [15, 0.99], [30, 0.995], [45, 0.98], [60, 0.934], [75, 0.896], [90, 0.832], [105, 0.794], [120, 0.798],
  [135, 0.783], [150, 0.766], [165, 0.698], [180, 0.567], [195, 0.612], [210, 0.87], [225, 1], [240, 0.99],
  [255, 0.996], [270, 0.98], [285, 0.937], [300, 0.898], [315, 0.836], [330, 0.794], [345, 0.799], [360, 0.781],
  [375, 0.767], [390, 0.718], [405, 0.578], [420, 0.595], [435, 0.868],
];
const TOTAL = 450;
const L = 10; // world length of the timeline
const X = (f: number) => (f / TOTAL - 0.5) * L;
const luma = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // sRGB components as stored, Rec. 709 weights
};

const LS = SHOTS.map(([, , c]) => luma(c));
const LMIN = Math.min(...LS), LMAX = Math.max(...LS);

const CAM: Cam = { position: [1.2, 7.4, 9.2], target: [0.4, 0, 0.7], fov: 36 };
const GAP = 0.05, SLAB_H = 0.42, SLAB_D = 1.6, POST_Z = 1.75;

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const ring = useMemo(() => new THREE.RingGeometry(0.07, 0.11, 24).rotateX(-Math.PI / 2), []);
  const disc = useMemo(() => new THREE.CircleGeometry(0.11, 24).rotateX(-Math.PI / 2), []);

  // playhead: one pass per loop, faded in and out at the ends so the jump back is not seen
  const frameAt = phase * TOTAL;
  const px = X(frameAt);
  const fade = Math.min(1, phase / 0.04, (1 - phase) / 0.04);
  const near = (f: number, w: number) => Math.max(0, 1 - Math.abs(frameAt - f) / w);

  const off = toScreen([X(114), SLAB_H + 0.05, -SLAB_D / 2], CAM, width, height);

  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 16, divisions: 16, y: -0.001 }}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${off.x} ${off.y}L${off.x - 40 * k} ${off.y - 48 * k}H${off.x - 190 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} />
        </svg>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: off.x - 190 * k, top: off.y - 70 * k, color: pal.ink }}>
          Cut at 3.80 s · off the beat
        </div>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Shot list of the bundled test clip · 9 shots, 450 frames</div>
          <div>samples/test-clip.shotlist.json · synthetic test pattern, 120 BPM pulse</div>
        </div>
        <div style={{ ...labelStyle(pal, k), fontSize: 9.5 * k, position: 'absolute', left: 28 * k, bottom: 20 * k }}>
          <div>Slab: shot, length in frames, grey from its mean colour</div>
          <div>Post: detected onset, height = strength</div>
          <div><span style={{ color: pal.ink }}>Disc</span>: cut on an onset · ring: off</div>
        </div>
      </>}>
      {SHOTS.map(([a, b, col], i) => {
        const len = X(b) - X(a) - GAP;
        const lit = frameAt >= a && frameAt < b ? fade : 0;
        const tone = (luma(col) - LMIN) / (LMAX - LMIN); // measured tone, stretched to the ramp
        return <Solid key={i} geometry={box} fill={mix(pal.lo, pal.hi, 0.08 + 0.42 * tone + 0.12 * lit)} edge={pal.hi}
          edgeOpacity={0.35 + 0.5 * lit} position={[(X(a) + X(b)) / 2, SLAB_H / 2, 0]} scale={[len, SLAB_H, SLAB_D]} />;
      })}
      {/* beat rail and onset posts */}
      <Solid geometry={box} fill={pal.f1} edge={pal.e1} position={[0, 0.01, POST_Z]} scale={[L, 0.02, 0.06]} />
      {ONSETS.map(([f, s]) => {
        const h = 0.15 + 0.75 * s;
        const hot = near(f, 6) * fade;
        return <Solid key={f} geometry={box} fill={mix(pal.mute, pal.hi, hot)} edge={mix(pal.mute, pal.hi, hot)}
          position={[X(f), h / 2, POST_Z]} scale={[0.035, h, 0.035]} />;
      })}
      {/* cut markers between slabs and posts */}
      {SHOTS.slice(1).map(([a, , , on]) => (
        <group key={a} position={[X(a), 0.012, (SLAB_D / 2 + POST_Z) / 2 + 0.05]}>
          <mesh geometry={on ? disc : ring}><meshBasicMaterial color={on ? pal.accent : pal.mute} /></mesh>
        </group>
      ))}
      {/* playhead plane */}
      <mesh position={[px, 0.75, 0.75]}>
        <boxGeometry args={[0.012, 1.5, 2.9]} />
        <meshBasicMaterial color={pal.accent} transparent opacity={0.22 * fade} depthWrite={false} />
      </mesh>
      {fade > 0.02 ? <Solid geometry={box} fill={pal.accent} edge={pal.accent} edgeOpacity={fade}
        position={[px, 1.5, 0.75]} scale={[0.02, 0.02, 2.9 * fade]} /> : null}
    </Stage>
  );
};
export default Scene;
