// LiveSeal: one seal period as an exploded view of the three planes the modem writes (Y, Cb, Cr).
// Data: public/liveseal-period.json, made by running the repo's own core/src/modem.ts (DEFAULT_MODEM)
// on the statement test vector of docs/PROTOCOL.md section 12. Signs, pilot cells, grid, slot count and
// per-plane amplitude are real. Height is exaggerated and time is slowed 4x.
import React, { useMemo } from 'react';
import { useVideoConfig, staticFile, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, mix, type Theme, type Cam } from '../kit';

type Period = {
  gridW: number; gridH: number; planes: number; symbols: number; symMs: number; pilotEvery: number;
  amplitude: number[]; wireBytes: number; pilots: string; slots: string[];
};

const CAM: Cam = { position: [10.3, 8.4, 20.9], target: [0.45, 1.6, 0], fov: 17 };
const CELL = 0.2, GAP = 0.035, GAP_Y = 1.75, LIFT = 0.03; // world units; LIFT per 8-bit level (exaggerated)
const PLANE_NAMES = ['Y  luma', 'Cb', 'Cr'];

const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const [data, setData] = React.useState<Period | null>(null);
  const [handle] = React.useState(() => delayRender('liveseal-period'));
  React.useEffect(() => {
    fetch(staticFile('liveseal-period.json')).then((r) => r.json()).then((d) => { setData(d); continueRender(handle); });
  }, [handle]);

  const box = useMemo(() => new THREE.BoxGeometry(CELL - GAP, 0.03, CELL - GAP), []);
  const mats = useMemo(() => ({
    up: new THREE.MeshLambertMaterial({ color: mix(pal.lo, pal.hi, theme === 'dark' ? 0.36 : 0.34) }),
    down: new THREE.MeshLambertMaterial({ color: mix(pal.lo, pal.hi, theme === 'dark' ? 0.1 : 0.12) }),
    pilotUp: new THREE.MeshLambertMaterial({ color: pal.accent }),
    pilotDown: new THREE.MeshLambertMaterial({ color: pal.accent }),
  }), [pal, theme]);

  if (!data) return null;
  const { gridW, gridH, symbols, planes } = data;
  const planeCells = gridW * gridH;
  const W = gridW * CELL, D = gridH * CELL;
  // eight slots per period, one loop = one period slowed 4x; short cross-fade into each slot
  const sf = phase * symbols;
  const slot = Math.floor(sf) % symbols;
  const prev = (slot + symbols - 1) % symbols;
  const m = smooth((sf - Math.floor(sf)) / 0.22);
  const planeY = (pl: number) => (planes - 1 - pl) * GAP_Y; // Y on top

  const cells: React.ReactNode[] = [];
  for (let pl = 0; pl < planes; pl++) {
    const amp = data.amplitude[pl];
    for (let c = 0; c < planeCells; c++) {
      const idx = pl * planeCells + c;
      const a = data.slots[prev][idx] === '+' ? 1 : -1;
      const b = data.slots[slot][idx] === '+' ? 1 : -1;
      const v = a + (b - a) * m;
      const x = (c % gridW) - gridW / 2 + 0.5, z = Math.floor(c / gridW) - gridH / 2 + 0.5;
      const pilot = data.pilots[idx] === '1';
      const mat = pilot ? mats.pilotUp : v >= 0 ? mats.up : mats.down;
      cells.push(<mesh key={idx} geometry={box} material={mat} position={[x * CELL, planeY(pl) + v * amp * LIFT, z * CELL]} />);
    }
  }

  const outline = (pl: number) => {
    const y = planeY(pl);
    const pts = [[-W / 2, y, -D / 2], [W / 2, y, -D / 2], [W / 2, y, D / 2], [-W / 2, y, D / 2], [-W / 2, y, -D / 2]]
      .map((p) => new THREE.Vector3(...(p as [number, number, number])));
    return <line key={'o' + pl}>
      <bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints(pts)} />
      <lineBasicMaterial attach="material" color={pal.e1} />
    </line>;
  };

  const tag = (pl: number) => toScreen([-W / 2 - 0.1, planeY(pl), D / 2], CAM, width, height);
  const lab = labelStyle(pal, k);
  const sec = ((slot * data.symMs) / 1000).toFixed(2);
  return (
    <Stage theme={theme} cam={CAM} grid={false}
      overlay={<>
        <div style={{ ...lab, position: 'absolute', left: 28 * k, top: 20 * k }}>
          <div style={{ color: pal.ink }}>One seal period, exploded into the three planes</div>
          <div>Real signs: PROTOCOL.md test vector, encoded by core/src/modem.ts</div>
        </div>
        {[0, 1, 2].map((pl) => {
          const p = tag(pl);
          return <div key={pl} style={{ ...lab, position: 'absolute', right: width - p.x + 10 * k, top: p.y - 9 * k, textAlign: 'right' }}>
            <span style={{ color: pal.ink }}>{PLANE_NAMES[pl]}</span>{`  ±${data.amplitude[pl]}/255`}
          </div>;
        })}
        <div style={{ ...lab, position: 'absolute', left: 28 * k, bottom: 18 * k }}>
          <div><span style={{ display: 'inline-block', width: 8 * k, height: 8 * k, background: pal.accent, marginRight: 8 * k }} />pilot cell, 1 in {data.pilotEvery} · 32 x 18 cells per plane</div>
          <div>Slot <span style={{ color: pal.ink }}>{slot + 1} of {symbols}</span> · {data.symMs} ms each, shown 4x slower</div>
          <div>Height exaggerated: the real shift is 2 to 3 of 255 levels</div>
        </div>
        <div style={{ ...lab, position: 'absolute', right: 28 * k, bottom: 18 * k, textAlign: 'right' }}>
          <div>t = {sec} s of 2 s</div>
        </div>
      </>}>
      {cells}
      {[0, 1, 2].map(outline)}
    </Stage>
  );
};
export default Scene;
