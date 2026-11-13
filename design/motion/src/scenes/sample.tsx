// Minimal example scene: copy this file, rename it, replace the content.
// Composition ids become <file>-dark and <file>-light.
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

const CAM: Cam = { position: [9, 7, 12], target: [0, 1, 0], fov: 28 };

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cols = [0, 1, 2, 3, 4];
  const tip = toScreen([3.2, 2.2, 0], CAM, width, height);
  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 24, divisions: 24 }}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${tip.x} ${tip.y}L${tip.x + 50 * k} ${tip.y - 40 * k}H${tip.x + 210 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} />
        </svg>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: tip.x + 54 * k, top: tip.y - 64 * k, color: pal.ink }}>Label on a leader</div>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Title of what is shown</div>
          <div>Source file · what is simulated</div>
        </div>
      </>}>
      {cols.map((i) => {
        const hgt = 1.6 + 1.2 * Math.sin(2 * Math.PI * (phase + i / 5));
        return <Solid key={i} geometry={box} fill={mix(pal.lo, pal.hi, 0.15 + 0.12 * i)} edge={pal.hi} edgeOpacity={0.5}
          position={[(i - 2) * 1.6, hgt / 2, 0]} scale={[1, hgt, 1]} />;
      })}
    </Stage>
  );
};
export default Scene;
