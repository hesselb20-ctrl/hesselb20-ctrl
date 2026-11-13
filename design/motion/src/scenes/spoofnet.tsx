// SpoofNet: the committed demo map snapshot (web/data/*.geojson, all simulated) as a 3D map.
// Coverage cells (H3 res 6) are columns whose height comes from their summed device-hours over the
// 24 hourly snapshots. The three simulated incidents light their affected cells one after another.
// The public snapshot carries no source estimate, so none is drawn.
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, mix, type Theme, type Cam } from '../kit';

type Cell = { id: string; r: [number, number][]; dh: number; n: number };
type Inc = { type: string; devices: string; conf: number; t0: number; t1: number; cells: string[] };
type Data = { hours: number; cells: Cell[]; incidents: Inc[] };

const CAM: Cam = { position: [50, 58, 96], target: [2, 0, 5], fov: 25 };
const HMAX = 9; // drawing scale, km (the map is drawn in km): tallest column; height ∝ sqrt(device-hours)
const NAMES: Record<string, string> = { jam: 'Jamming', spoof: 'Spoofing', meacon: 'Meaconing' };

const prism = (r: [number, number][], h: number) => {
  const s = new THREE.Shape();
  r.forEach(([x, y], i) => (i ? s.lineTo(x / 1000, y / 1000) : s.moveTo(x / 1000, y / 1000)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // footprint on the ground (x east, -z north), height along +y
  return g;
};
const centre = (r: [number, number][]) => [r.reduce((a, p) => a + p[0], 0) / r.length / 1000, r.reduce((a, p) => a + p[1], 0) / r.length / 1000];
const hhmm = (t: number) => new Date(t * 1000).toISOString().slice(11, 16);

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const [data, setData] = React.useState<Data | null>(null);
  const [handle] = React.useState(() => delayRender('spoofnet-map'));
  React.useEffect(() => {
    fetch(staticFile('spoofnet-map.json')).then((r) => r.json()).then((d) => { setData(d); continueRender(handle); });
  }, [handle]);
  const geo = useMemo(() => {
    if (!data) return null;
    const max = Math.max(...data.cells.map((c) => c.dh));
    return data.cells.map((c) => {
      const h = Math.max(0.12, HMAX * Math.sqrt(c.dh / max));
      const g = prism(c.r, h);
      return { c, h, g, e: new THREE.EdgesGeometry(g, 20) };
    });
  }, [data]);
  if (!data || !geo) return <AbsoluteFill style={{ background: pal.bg }} />;

  // three incidents, one third of the loop each; envelope is zero at every switch, so the loop is seamless
  const n = data.incidents.length;
  const idx = Math.min(n - 1, Math.floor(phase * n));
  const u = phase * n - idx;
  const env = Math.sin(Math.PI * u) ** 2;
  const inc = data.incidents[idx];
  const lit = new Set(inc.cells);
  const litGeo = geo.filter((g) => lit.has(g.c.id));
  const cx = litGeo.reduce((a, g) => a + centre(g.c.r)[0], 0) / litGeo.length;
  const cy = litGeo.reduce((a, g) => a + centre(g.c.r)[1], 0) / litGeo.length;
  const topY = Math.max(...litGeo.map((g) => g.h)) + 5;
  const tip = toScreen([cx, topY, -cy], CAM, width, height);
  const lx = 466 * k, ly = 84 * k; // fixed slot right of the title, clear of the columns
  const sw = (c: string, b: string) => <span style={{ display: 'inline-block', width: 9 * k, height: 9 * k, background: c, border: `1px solid ${b}`, marginRight: 7 * k, verticalAlign: 'middle' }} />;
  const L = labelStyle(pal, k);
  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 90, divisions: 30, y: -0.01 }}
      overlay={<>
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${tip.x} ${tip.y}L${lx - 10 * k} ${ly + 28 * k}H${lx + 290 * k}`} fill="none" stroke={pal.accent} strokeWidth={k} opacity={0.25 + 0.75 * env} />
          <circle cx={tip.x} cy={tip.y} r={3 * k} fill={pal.accent} />
        </svg>
        <div style={{ ...L, position: 'absolute', left: lx, top: ly - 34 * k, color: pal.ink, opacity: 0.3 + 0.7 * env }}>
          <div style={{ color: pal.accent }}>Simulated incident {idx + 1} of {n} · {NAMES[inc.type] ?? inc.type}</div>
          <div>{inc.devices} devices · {hhmm(inc.t0)}–{hhmm(inc.t1)} UTC</div>
          <div>{inc.cells.length} public cells · no source shown</div>
        </div>
        <div style={{ ...L, position: 'absolute', left: 28 * k, top: 22 * k }}>
          <div style={{ color: pal.ink }}>Demo map · {data.cells.length} coverage cells, {data.hours} hours</div>
          <div>web/data snapshot · simulated phones, replay only</div>
        </div>
        <div style={{ ...L, position: 'absolute', left: 28 * k, bottom: 20 * k }}>
          <div>{sw(pal.hi, pal.hi)}Cells inside the incident</div>
          <div>{sw(theme === 'dark' ? mix(pal.e1, pal.mute, 0.2) : pal.f1, theme === 'dark' ? mix(pal.e1, pal.ink, 0.5) : pal.e1)}Covered · height ∝ √ device-hours</div>
          <div>Everything else: no data</div>
        </div>
      </>}>
      {geo.map(({ c, h, g, e }) => {
        const on = lit.has(c.id);
        // dark theme: covered cells one step lighter with brighter edges so all columns read; incident cells stay brightest
        const dark = theme === 'dark';
        const base = dark ? mix(pal.e1, pal.mute, 0.2) : pal.f1;
        const fill = on ? mix(base, pal.hi, (dark ? 0.3 : 0.15) + 0.65 * env) : base;
        const edge = on ? pal.hi : dark ? mix(pal.e1, pal.ink, 0.5) : pal.e1;
        return (
          <group key={c.id}>
            <mesh geometry={g}><meshLambertMaterial color={fill} /></mesh>
            <lineSegments geometry={e}><lineBasicMaterial color={edge} transparent opacity={on ? 0.5 + 0.5 * env : 0.9} /></lineSegments>
          </group>
        );
      })}
      <mesh position={[cx, topY / 2, -cy]}>
        <cylinderGeometry args={[0.06, 0.06, topY, 6]} />
        <meshBasicMaterial color={pal.accent} transparent opacity={0.25 + 0.6 * env} />
      </mesh>
    </Stage>
  );
};
export default Scene;
