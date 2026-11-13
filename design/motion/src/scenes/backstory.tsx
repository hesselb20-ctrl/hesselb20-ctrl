// Backstory: the 28 decision records of the committed chalk example as a 3D timeline.
// Data: examples/chalk/decisions/index.json in hesselb20-ctrl/backstory (id, date, status, confidence, evidence count).
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

// [id, date, status, confidence, evidence items] copied from index.json
const RECORDS: [string, string, 'active' | 'reverted', 'low' | 'medium' | 'high', number][] = [
  ['0001', '2014-03-26', 'active', 'low', 1], ['0002', '2014-06-14', 'active', 'low', 1],
  ['0003', '2015-05-25', 'active', 'medium', 1], ['0004', '2015-08-20', 'active', 'medium', 1],
  ['0005', '2015-12-12', 'active', 'low', 1], ['0006', '2017-05-21', 'active', 'medium', 1],
  ['0007', '2017-06-20', 'active', 'medium', 1], ['0008', '2017-07-23', 'active', 'medium', 2],
  ['0009', '2017-10-17', 'active', 'medium', 2], ['0010', '2018-02-14', 'reverted', 'low', 2],
  ['0011', '2018-09-18', 'active', 'medium', 1], ['0012', '2018-12-26', 'active', 'low', 1],
  ['0013', '2018-12-26', 'active', 'medium', 2], ['0014', '2019-03-12', 'active', 'medium', 2],
  ['0015', '2019-03-12', 'active', 'medium', 1], ['0016', '2019-04-28', 'active', 'medium', 2],
  ['0017', '2019-07-12', 'active', 'medium', 2], ['0018', '2019-07-12', 'active', 'low', 1],
  ['0019', '2020-04-02', 'active', 'medium', 1], ['0020', '2021-04-16', 'active', 'medium', 1],
  ['0021', '2021-07-30', 'active', 'medium', 2], ['0022', '2021-11-10', 'active', 'medium', 2],
  ['0023', '2021-11-26', 'active', 'medium', 1], ['0024', '2022-03-09', 'active', 'medium', 1],
  ['0025', '2022-10-12', 'active', 'medium', 4], ['0026', '2026-03-29', 'active', 'low', 1],
  ['0027', '2026-07-25', 'active', 'medium', 1], ['0028', '2026-09-25', 'active', 'low', 1],
];

const Y0 = 2014, Y1 = 2027; // axis span in years, one world unit per year
const X = (year: number) => year - (Y0 + Y1) / 2;
const ROWS = { high: -2.2, medium: 0, low: 2.2 } as const;
const AXIS_Z = 3.4;
const UNIT = 0.5; // pillar height per evidence item
const yearOf = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return y + (m - 1) / 12 + (dd - 1) / 365;
};

const CAM: Cam = { position: [-1.2, 9.5, 21], target: [-0.9, 0.3, 0.6], fov: 26 };
const SWEEP = 0.82; // part of the loop the read head takes to cross the axis

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  // same-day records in one row sit side by side
  const pillars = useMemo(() => {
    const seen = new Map<string, number>();
    return RECORDS.map(([id, date, status, conf, ev]) => {
      const key = `${date}|${conf}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      return { id, status, conf, ev, x: X(yearOf(date)) + n * 0.2, z: ROWS[conf], h: ev * UNIT };
    });
  }, []);
  const count = (c: string) => RECORDS.filter((r) => r[3] === c).length;

  const axis = useMemo(() => {
    const pts: number[] = [X(Y0), 0, AXIS_Z, X(Y1), 0, AXIS_Z];
    for (let y = Y0; y <= Y1; y++) pts.push(X(y), 0, AXIS_Z, X(y), 0, AXIS_Z + (y % 4 === 2 ? 0.28 : 0.14));
    for (const z of Object.values(ROWS)) pts.push(X(Y0), 0, z, X(Y1), 0, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  // read head: crosses the axis once per loop, then everything dims back before the loop restarts
  const u = Math.min(phase / SWEEP, 1);
  const headX = X(Y0) + u * (Y1 - Y0);
  const fadeOut = phase < SWEEP ? 1 : Math.max(0, 1 - (phase - SWEEP) / (1 - SWEEP - 0.04));
  const headOn = phase < SWEEP ? Math.min(1, phase / 0.04) : fadeOut;
  const lit = (x: number) => Math.max(0, Math.min(1, (headX - x) / 0.6)) * fadeOut;

  const head = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, ROWS.high - 0.6, 0, 0, AXIS_Z + 0.4, 0, 0, AXIS_Z + 0.4, 0, 2.4, AXIS_Z + 0.4], 3));
    return g;
  }, []);

  const rev = pillars.find((p) => p.status === 'reverted')!;
  const top = pillars.reduce((a, b) => (b.ev > a.ev ? b : a));
  const tipRev = toScreen([rev.x, rev.h, rev.z], CAM, width, height);
  const tipTop = toScreen([top.x, top.h, top.z], CAM, width, height);
  const rowLab = (z: number) => toScreen([X(Y0) - 0.3, 0, z], CAM, width, height);
  const years = [2014, 2018, 2022, 2026].map((y) => ({ y, p: toScreen([X(y), 0, AXIS_Z + 0.5], CAM, width, height) }));
  const L = labelStyle(pal, k);

  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 20, divisions: 10, y: -0.01 }}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${tipRev.x} ${tipRev.y - 4 * k}L${tipRev.x + 30 * k} ${tipRev.y - 70 * k}H${tipRev.x + 150 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} />
          <path d={`M${tipTop.x} ${tipTop.y - 4 * k}L${tipTop.x + 24 * k} ${tipTop.y - 34 * k}H${tipTop.x + 190 * k}`} fill="none" stroke={pal.mute} strokeWidth={k} />
        </svg>
        <div style={{ ...L, position: 'absolute', left: tipRev.x + 34 * k, top: tipRev.y - 92 * k, color: pal.ink }}>ADR 0010 · reverted</div>
        <div style={{ ...L, position: 'absolute', left: tipTop.x + 28 * k, top: tipTop.y - 56 * k }}>ADR {top.id} · {top.ev} evidence items</div>
        {(['high', 'medium', 'low'] as const).map((c) => {
          const p = rowLab(ROWS[c]);
          return <div key={c} style={{ ...L, position: 'absolute', right: width - p.x, top: p.y - 9 * k }}>{c} · {count(c)}</div>;
        })}
        {years.map(({ y, p }) => <div key={y} style={{ ...L, position: 'absolute', left: p.x - 16 * k, top: p.y }}>{y}</div>)}
        <div style={{ ...L, position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Decision timeline · 28 records</div>
          <div>Example run on chalk/chalk · examples/chalk/decisions/index.json · model-written</div>
        </div>
        <div style={{ ...L, position: 'absolute', left: 28 * k, bottom: 20 * k }}>
          <div>Row · confidence the model gave</div>
          <div>Height · evidence items linked</div>
          <div>Outline only · status reverted</div>
        </div>
      </>}>
      <lineSegments geometry={axis} position={[0, 0.01, 0]}><lineBasicMaterial color={pal.mute} /></lineSegments>
      <group position={[headX, 0, 0]}>
        <lineSegments geometry={head}><lineBasicMaterial color={pal.accent} transparent opacity={0.85 * headOn} /></lineSegments>
      </group>
      {pillars.map((p) => {
        const v = lit(p.x);
        const reverted = p.status === 'reverted';
        return <Solid key={p.id} geometry={box}
          fill={reverted ? pal.bg : mix(pal.f1, pal.hi, 0.2 + 0.55 * v)}
          edge={mix(pal.e1, pal.hi, v)} edgeOpacity={0.9}
          position={[p.x, p.h / 2, p.z]} scale={[0.17, p.h, 0.17]} />;
      })}
    </Stage>
  );
};
export default Scene;
