// Portfolio index: twelve repositories as slabs in three groups. Each slab carries its real repository name.
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

const CAM: Cam = { position: [1.0, 16, 20], target: [1.0, 0, 0.5], fov: 26 };
const GROUPS: [string, string[]][] = [
  ['Sensing', ['quakescore', 'quakescore-collector', 'spoofnet', 'ghost-channel', 'liveseal']],
  ['Agents', ['glassbox', 'cea', 'tracekit', 'backstory', 'outside-in']],
  ['Media', ['shotlist', 'caliper']],
];

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const box = useMemo(() => new THREE.BoxGeometry(2.1, 1, 1.5), []);
  const items = GROUPS.flatMap(([, names], gi) => names.map((name, i) => ({ name, gi, x: (i - 2) * 2.9 + 1.2, z: (gi - 1) * 3.1 })));
  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 40, divisions: 40, y: -0.01 }}
      overlay={<>
        {items.map((it, n) => {
          const p = toScreen([it.x - 1.05, 0, it.z + 0.95], CAM, width, height);
          const q = toScreen([it.x + 1.05, 0, it.z + 0.95], CAM, width, height);
          return <div key={it.name} style={{ ...labelStyle(pal, k), fontSize: 8.4 * k, lineHeight: 1.35, whiteSpace: 'normal', width: q.x - p.x + 14 * k, position: 'absolute', left: p.x, top: p.y + 4 * k, color: pal.ink }}>{it.name.replace(/-/g, '-​')}</div>;
        })}
        {GROUPS.map(([label], gi) => {
          const p = toScreen([-6.4, 0, (gi - 1) * 3.1 + 0.2], CAM, width, height);
          return <div key={label} style={{ ...labelStyle(pal, k), position: 'absolute', right: width - p.x + 8 * k, top: p.y - 8 * k, textAlign: 'right' }}>{label}</div>;
        })}
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Twelve repositories, three groups</div>
          <div>Every one a prototype · each README states what is verified</div>
        </div>
      </>}>
      {items.map((it, n) => {
        // one slab at a time rises slightly and brightens, in reading order
        const w = Math.max(0, Math.cos(2 * Math.PI * (phase - n / items.length))) ** 10;
        const h = 0.22 + 0.5 * w;
        return <Solid key={it.name} geometry={box} fill={mix(pal.f1, pal.hi, 0.06 + 0.5 * w)} edge={pal.hi} edgeOpacity={0.35 + 0.65 * w}
          position={[it.x, h / 2, it.z]} scale={[1, h, 1]} />;
      })}
    </Stage>
  );
};
export default Scene;
