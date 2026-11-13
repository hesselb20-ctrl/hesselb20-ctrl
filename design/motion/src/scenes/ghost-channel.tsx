// Ghost Channel: the standard preset's 16x9 cell grid, one real packet (two symbols) from the repo's own
// encoder (public/ghost-channel-cells.json, dumped from src/core/packet.ts Transmitter.symbolCells with the
// landing page message). Each tile's height follows the 20 Hz carrier at the cell's QPSK quadrant,
// cos(2*pi*f*t + q*pi/2), with the 70 % edge-cycle envelope. Time slowed 20x, height exaggerated.
import React, { useMemo } from 'react';
import { staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

type Cells = {
  cols: number; rows: number; nPilots: number; isPilot: number[]; rotation: number[];
  symbols: number[][]; cyclesPerSymbol: number; symbolsPerPacket: number;
};

const CAM: Cam = { position: [4.5, 17, 19.5], target: [2.2, 0, 1.6], fov: 36 };
const PITCH = 1.1, TILE = 0.86;
const APEX: [number, number, number] = [12.2, 4.2, 6.8];

const Frustum: React.FC<{ color: string }> = ({ color }) => {
  const geo = useMemo(() => {
    const apex = new THREE.Vector3(...APEX);
    const dir = new THREE.Vector3(0, 0, 0).sub(apex).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const u = new THREE.Vector3().crossVectors(right, dir).normalize();
    const c = apex.clone().add(dir.clone().multiplyScalar(1.8));
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
      c.clone().add(right.clone().multiplyScalar(a * 0.62)).add(u.clone().multiplyScalar(b * 0.35)));
    const pts: THREE.Vector3[] = [];
    corners.forEach((p, i) => { pts.push(apex, p, p, corners[(i + 1) % 4]); });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return <lineSegments geometry={geo}><lineBasicMaterial color={color} /></lineSegments>;
};

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = Math.floor(usePhase() * 48) / 48; // update every second frame to keep the GIF small
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const [d, setD] = React.useState<Cells | null>(null);
  const [handle] = React.useState(() => delayRender('ghost-cells'));
  React.useEffect(() => {
    fetch(staticFile('ghost-channel-cells.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(handle); });
  }, [handle]);
  const box = useMemo(() => new THREE.BoxGeometry(TILE, 1, TILE), []);
  const frame = useMemo(() => {
    const w = 16 * PITCH / 2 + 0.2, h = 9 * PITCH / 2 + 0.2;
    return new THREE.BufferGeometry().setFromPoints([[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  }, []);
  if (!d) return null;

  // One packet = 2 symbols looped over 8 s: 4 s per symbol, carrier 1 Hz in scene time (real 20 Hz, 200 ms).
  const S = d.symbolsPerPacket, nCyc = d.cyclesPerSymbol;
  const u = phase * S;                       // symbol position 0..2
  const s = Math.min(S - 1, Math.floor(u));
  const cyc = (u - s) * nCyc;                // carrier cycles into this symbol
  const env = Math.floor(cyc) === 0 || Math.floor(cyc) === nCyc - 1 ? 0.7 : 1;
  const tCar = phase * S * nCyc;             // whole cycles over the loop: seamless
  const q = d.symbols[s];
  const sampleIdx = Math.floor(phase * S * nCyc * 1.5); // 30 fps camera = 1.5 samples per 20 Hz cycle
  const nSamples = S * nCyc * 1.5;

  const label = labelStyle(pal, k);
  const pilotTip = (() => {
    const i = d.isPilot.findIndex((v, j) => v && Math.floor(j / d.cols) === 0 && j % d.cols > 6);
    const c = i % d.cols, r = Math.floor(i / d.cols);
    return toScreen([(c - 7.5) * PITCH, 0.6, (r - 4) * PITCH], CAM, width, height);
  })();
  const camTip = toScreen(APEX, CAM, width, height);
  const combX = 520 * k, combY = 412 * k, combW = 250 * k;

  return (
    <Stage theme={theme} cam={CAM} grid={false}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${pilotTip.x} ${pilotTip.y}L${pilotTip.x + 30 * k} ${pilotTip.y - 34 * k}H${pilotTip.x + 150 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} />
          <path d={`M${combX} ${combY}H${combX + combW}`} stroke={pal.rule} strokeWidth={k} />
          {Array.from({ length: nSamples }, (_, i) => {
            const x = combX + ((i + 0.5) / nSamples) * combW;
            return <path key={i} d={`M${x} ${combY - 7 * k}V${combY}`} stroke={i === sampleIdx ? pal.accent : pal.mute} strokeWidth={(i === sampleIdx ? 1.6 : 1) * k} />;
          })}
          <path d={`M${combX + phase * combW} ${combY + 3 * k}v5`} stroke={pal.ink} strokeWidth={k} />
        </svg>
        <div style={{ ...label, position: 'absolute', left: pilotTip.x + 34 * k, top: pilotTip.y - 56 * k, color: pal.ink }}>Pilot cell, known phase</div>
        <div style={{ ...label, position: 'absolute', left: camTip.x - 150 * k, top: camTip.y + 16 * k }}>30 fps camera</div>
        <div style={{ ...label, position: 'absolute', left: combX, top: combY + 6 * k }}>camera samples, 1.5 per cycle</div>
        <div style={{ ...label, position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Standard preset: 16 x 9 cells, 18 pilots</div>
          <div>Real cell phases from the encoder · height exaggerated, time 20x slower</div>
        </div>
        <div style={{ ...label, position: 'absolute', left: 28 * k, top: 370 * k }}>
          <div>Height = 20 Hz carrier at the cell's QPSK phase</div>
          <div>One packet, symbol {s + 1} of 2 · whole-grid rotation {d.rotation[s] * 90} deg</div>
          <div>Real symbol 200 ms, 4 carrier cycles</div>
        </div>
      </>}>
      <Outline geometry={frame} color={pal.mute} />
      {q.map((qq, i) => {
        const c = i % d.cols, r = Math.floor(i / d.cols);
        const v = env * Math.cos(2 * Math.PI * tCar + (Math.PI / 2) * qq);
        const h = 0.32 + 0.22 * v;
        const pilot = d.isPilot[i] === 1;
        return <Solid key={i} geometry={box}
          fill={mix(pal.f1, pal.e1, 0.35)} edge={pilot ? pal.accent : mix(pal.e1, pal.mute, theme === 'dark' ? 0.7 : 0)} edgeOpacity={1}
          position={[(c - 7.5) * PITCH, h / 2, (r - 4) * PITCH]} scale={[1, h, 1]} />;
      })}
      <Frustum color={pal.mute} />
    </Stage>
  );
};

// thin polyline helper (three's <line> clashes with SVG <line> in JSX types)
const Outline: React.FC<{ geometry: THREE.BufferGeometry; color: string }> = ({ geometry, color }) => {
  const obj = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })), [geometry, color]);
  return <primitive object={obj} />;
};

export default Scene;
