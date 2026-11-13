// Caliper: the real example output (examples/bracket/out/part.stl) turning once, with three of its
// params.json values dimensioned. The 40 mm hole spacing is the one reference the scan was given.
import React, { useEffect, useMemo, useState } from 'react';
import { staticFile, delayRender, continueRender, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

const CAM: Cam = { position: [150, 105, 185], target: [0, 14, 0], fov: 26 };
type V3 = [number, number, number];

// CAD frame (Z up, mm) -> three frame (Y up)
const toThree = ([x, y, z]: V3): V3 => [x, z, -y];
const spin = ([x, y, z]: V3, a: number): V3 => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const camDir = (() => { const v = new THREE.Vector3(...CAM.position).normalize(); return [v.x, v.y, v.z]; })();

// Values from examples/bracket/out/params.json
const P = { L: 80, W: 50, T: 5, FH: 40.5, HX: 20, HY: -8 };

type Dim = { id: string; segs: [V3, V3][]; label: V3; out: V3; text: string; key?: boolean };
const tick = (p: V3, d: V3): [V3, V3] => [[p[0] - d[0], p[1] - d[1], p[2] - d[2]], [p[0] + d[0], p[1] + d[1], p[2] + d[2]]];
const DIMS: Dim[] = (() => {
  const yd = -P.W / 2 - 9; // hole spacing dimension line, in front of the plate, on the top face
  const z = P.T;
  const xd = P.L / 2 + 9; // flange height, beside the +x end of the flange
  const yf = P.W / 2;
  const xw = -P.L / 2 - 9; // plate width, beside the -x end
  return [
    { id: 'ref', key: true, text: 'Hole spacing 40 mm · reference', out: [0, -1, 0], label: [0, yd - 9, z],
      segs: [[[-P.HX, P.HY - 4.5, z], [-P.HX, yd - 2, z]], [[P.HX, P.HY - 4.5, z], [P.HX, yd - 2, z]],
        [[-P.HX, yd, z], [P.HX, yd, z]], tick([-P.HX, yd, z], [1.6, 1.6, 0]), tick([P.HX, yd, z], [1.6, 1.6, 0])] },
    { id: 'fh', text: 'Flange height 40.5', out: [1, 0, 0], label: [xd + 3, yf, P.FH / 2],
      segs: [[[P.L / 2 + 2, yf, 0], [xd + 2, yf, 0]], [[P.L / 2 + 2, yf, P.FH], [xd + 2, yf, P.FH]],
        [[xd, yf, 0], [xd, yf, P.FH]], tick([xd, yf, 0], [1.6, 0, 1.6]), tick([xd, yf, P.FH], [1.6, 0, 1.6])] },
    { id: 'w', text: 'Width 50', out: [-1, 0, 0], label: [xw - 3, 0, 0],
      segs: [[[-P.L / 2 - 2, -P.W / 2, 0], [xw - 2, -P.W / 2, 0]], [[-P.L / 2 - 2, P.W / 2, 0], [xw - 2, P.W / 2, 0]],
        [[xw, -P.W / 2, 0], [xw, P.W / 2, 0]], tick([xw, -P.W / 2, 0], [1.6, 1.6, 0]), tick([xw, P.W / 2, 0], [1.6, 1.6, 0])] },
  ];
})();

const lineGeo = (segs: [V3, V3][]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(segs.flatMap(([a, b]) => [...toThree(a), ...toThree(b)]), 3));
  return g;
};

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const [data, setData] = useState<{ v: number[]; i: number[] } | null>(null);
  const [handle] = useState(() => delayRender('caliper part'));
  useEffect(() => {
    fetch(staticFile('caliper-part.json')).then((r) => r.json()).then((d) => { setData(d); continueRender(handle); });
  }, [handle]);
  const geo = useMemo(() => {
    if (!data) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(data.v, 3));
    g.setIndex(data.i);
    const flat = g.toNonIndexed();
    flat.computeVertexNormals();
    return flat;
  }, [data]);
  const lines = useMemo(() => DIMS.map((d) => lineGeo(d.segs)), []);

  const a = 2 * Math.PI * phase; // one full turn per loop
  const vis = DIMS.map((d) => {
    const o = spin(toThree(d.out), a);
    const dot = o[0] * camDir[0] + o[1] * camDir[1] + o[2] * camDir[2];
    return Math.max(0, Math.min(1, (dot - 0.05) * 3));
  });
  const labels = DIMS.map((d, j) => ({ d, p: toScreen(spin(toThree(d.label), a), CAM, width, height), o: vis[j] }));

  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 240, divisions: 24, y: -0.05 }}
      overlay={<>
        {labels.map(({ d, p, o }) => o > 0.01 ? (
          <div key={d.id} style={{ ...labelStyle(pal, k), position: 'absolute', left: p.x, top: p.y,
            transform: 'translate(-50%, -50%)', opacity: o, color: d.key ? pal.accent : pal.mute,
            background: pal.bg, padding: `0 ${4 * k}px`, filter: 'grayscale(1)' }}>{d.text}</div>
        ) : null)}
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: 28 * k, top: 22 * k, filter: 'grayscale(1)' }}>
          <div style={{ color: pal.ink }}>Caliper output · example bracket</div>
          <div>part.stl, rebuilt from 3 rendered photos, not real ones</div>
        </div>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: 28 * k, bottom: 20 * k, filter: 'grayscale(1)' }}>
          <div>Sizes from examples/bracket/out/params.json</div>
          <div>One known value given · the rest scaled from it</div>
        </div>
      </>}>
      <group rotation={[0, a, 0]}>
        {geo ? <Solid geometry={geo} fill={mix(pal.lo, pal.hi, theme === 'dark' ? 0.22 : 0.12)} edge={pal.hi} edgeOpacity={theme === 'dark' ? 0.6 : 0.75} rotation={[-Math.PI / 2, 0, 0]} /> : null}
        {DIMS.map((d, j) => (
          <lineSegments key={d.id} geometry={lines[j]}>
            <lineBasicMaterial color={d.key ? pal.accent : pal.mute} transparent opacity={vis[j]} />
          </lineSegments>
        ))}
      </group>
    </Stage>
  );
};
export default Scene;
