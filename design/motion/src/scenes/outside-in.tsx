// Outside-In: the committed demo report (examples/report/report.json) as a two-layer evidence structure.
// Lower layer: the 45 evidence items, grouped by the collector that produced them.
// Upper layer: the 13 findings, toned by their confidence grade, with lines to the evidence ids they cite.
import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

// Read from examples/report/report.json (offline rules, target localhost:4173, fictional company).
const GROUPS: [string, string[]][] = [
  ['tech', ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10']],
  ['pricing', ['P1', 'P2', 'P3', 'P4']],
  ['careers', ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9', 'J10']],
  ['changelog', ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']],
  ['dns', ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']],
  ['reviews', ['R1', 'R2', 'R3', 'R4', 'R5']],
];
type Grade = 'high' | 'medium' | 'low';
const FINDINGS: [Grade, string[]][] = [
  ['high', ['T7', 'D3']], ['high', ['D1', 'D2', 'D4', 'D5', 'D6']], ['high', ['D8', 'T10']],
  ['high', ['P1', 'P2', 'P3', 'P4']], ['high', ['J9', 'J1', 'J2', 'J3', 'J4', 'J5']], ['high', ['J10', 'T3', 'T1', 'T2']],
  ['high', ['C7', 'C8', 'C1', 'C2', 'C3', 'C4']], ['high', ['R1', 'R2', 'R3', 'R4', 'R5']],
  ['medium', ['T1', 'T2', 'T3', 'T4', 'T5']], ['medium', ['T6', 'T8', 'T9']],
  ['medium', ['P2', 'P3', 'J5', 'J6', 'J7', 'C8']], ['low', ['J10']], ['low', ['R1', 'R2']],
];
const TONE: Record<Grade, number> = { high: 0.9, medium: 0.5, low: 0.18 };

const CAM: Cam = { position: [0, 8.5, 17], target: [0, 1.3, -0.6], fov: 34 };
const CELL = 0.44, COLS = 5, GAP = 0.75, FY = 3.4, FZ = -1.8, FSTEP = 1.12;

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const evBox = useMemo(() => new THREE.BoxGeometry(0.32, 0.2, 0.32), []);
  const fBox = useMemo(() => new THREE.BoxGeometry(0.62, 0.26, 0.62), []);

  // positions of evidence blocks
  const evPos = useMemo(() => {
    const pos: Record<string, [number, number, number]> = {};
    const total = GROUPS.length * COLS * CELL + (GROUPS.length - 1) * GAP;
    let gx = -total / 2;
    for (const [, ids] of GROUPS) {
      ids.forEach((id, i) => {
        pos[id] = [gx + (i % COLS) * CELL + CELL / 2, 0.1, Math.floor(i / COLS) * CELL];
      });
      gx += COLS * CELL + GAP;
    }
    return pos;
  }, []);
  const fPos = FINDINGS.map((_, i) => [(i - (FINDINGS.length - 1) / 2) * FSTEP, FY, FZ] as [number, number, number]);

  // one citation-line geometry per finding
  const lines = useMemo(() => FINDINGS.map(([, ids], i) => {
    const pts: number[] = [];
    for (const id of ids) {
      const e = evPos[id];
      pts.push(fPos[i][0], FY - 0.13, fPos[i][2], e[0], 0.2, e[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }), [evPos]);

  // findings light one at a time; 13 equal slots per loop, smooth in and out
  const slot = phase * FINDINGS.length;
  const act = FINDINGS.map((_, i) => {
    const u = slot - i;
    return u >= 0 && u < 1 ? Math.sin(Math.PI * u) ** 2 : 0;
  });
  const evAct: Record<string, number> = {};
  FINDINGS.forEach(([, ids], i) => ids.forEach((id) => { evAct[id] = Math.max(evAct[id] ?? 0, act[i]); }));

  const cur = Math.min(FINDINGS.length - 1, Math.floor(slot));
  const tip = toScreen([fPos[cur][0], FY + 0.15, FZ], CAM, width, height);
  const right = cur > 7;
  const lx = right ? tip.x - 40 * k : tip.x + 40 * k;

  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 30, divisions: 30, y: -0.001 }}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${tip.x} ${tip.y}L${lx} ${tip.y - 34 * k}H${right ? lx - 190 * k : lx + 190 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} />
        </svg>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', top: tip.y - 56 * k, color: pal.ink,
          ...(right ? { right: width - lx + 4 * k } : { left: lx + 4 * k }) }}>
          Finding {cur + 1} of 13 · {FINDINGS[cur][0]} · cites {FINDINGS[cur][1].length}
        </div>
        <div style={{ ...labelStyle(pal, k), position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Demo report as evidence: 13 findings over 45 items</div>
          <div>examples/report/report.json · fictional demo company, offline rules</div>
        </div>
        <div style={{ ...labelStyle(pal, k), fontSize: 9.5 * k, position: 'absolute', left: 28 * k, bottom: 18 * k }}>
          <div>Upper row: findings, tone = confidence high / medium / low</div>
          <div>Lower groups, left to right: tech, pricing, careers, changelog, dns, reviews</div>
        </div>
      </>}>
      {GROUPS.flatMap(([, ids]) => ids).map((id) => (
        <Solid key={id} geometry={evBox} fill={mix(pal.f1, pal.hi, 0.18 + 0.6 * (evAct[id] ?? 0))} edge={mix(pal.e1, pal.ink, 0.25)}
          edgeOpacity={0.9} position={evPos[id]} />
      ))}
      {FINDINGS.map(([g], i) => (
        <Solid key={i} geometry={fBox} fill={mix(pal.lo, pal.hi, TONE[g])} edge={act[i] > 0.05 ? pal.accent : pal.e1}
          edgeOpacity={0.6 + 0.4 * act[i]} position={[fPos[i][0], FY + 0.12 * act[i], FZ]} />
      ))}
      {lines.map((g, i) => (
        <lineSegments key={i} geometry={g}>
          <lineBasicMaterial color={act[i] > 0.02 ? pal.accent : pal.mute} transparent opacity={0.14 + 0.8 * act[i]} />
        </lineSegments>
      ))}
    </Stage>
  );
};
export default Scene;
