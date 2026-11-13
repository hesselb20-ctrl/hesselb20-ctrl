// QuakeScore collector: a phone lying flat, its three accelerometer axes, and the three analysis bands the page
// computes (dsp.js: NFFT 2048, bands L/M/H at 3.125, 12.5 and 50 Hz). Each band panel carries the averaged
// spectrum the page code produced from the synthetic test stream stream_c (quakescore tests/vectors), read from
// public/quakescore-collector-spectra.json. A cursor sweeps each panel; the axes light in turn.
import React, { useMemo } from 'react';
import { staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import * as THREE from 'three';
import { Stage, PAL, usePhase, labelStyle, toScreen, Solid, mix, type Theme, type Cam } from '../kit';

type Band = { fs: number; k: number; df: number; nyq: number; horiz: number[]; vert: number[] };
type Data = { nfft: number; fsRaw: number; bands: Record<'L' | 'M' | 'H', Band> };

const CAM: Cam = { position: [0, 5.0, 10.2], target: [0, 0.6, -0.4], fov: 31 };
const PW = 2.6, PH = 1.7, LO = -11, HI = -4; // panel size (world units) and log10 PSD range shown
const PANELS: { id: 'L' | 'M' | 'H'; x: number; z: number; ry: number }[] = [
  { id: 'L', x: -2.95, z: -1.0, ry: 0.22 },
  { id: 'M', x: 0, z: -1.35, ry: 0 },
  { id: 'H', x: 2.95, z: -1.0, ry: -0.22 },
];
const PHONE: [number, number, number] = [0, 0.03, 2.2];

// local panel coordinates -> world
const toWorld = (p: (typeof PANELS)[number], u: number, v: number): [number, number, number] => {
  const lx = (u - 0.5) * PW, c = Math.cos(p.ry), s = Math.sin(p.ry);
  return [p.x + lx * c + 0.03 * s, v, p.z - lx * s + 0.03 * c]; // 0.03 in front of the panel face
};
const yOf = (val: number) => 0.12 + (PH - 0.3) * Math.max(0, Math.min(1, (val - LO) / (HI - LO)));
const lineObj = (pts: [number, number, number][], color: string, opacity = 1) => {
  const g = new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(...q)));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
};

const Scene: React.FC<{ theme: Theme }> = ({ theme }) => {
  const pal = PAL[theme];
  const phase = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 800;
  const [data, setData] = React.useState<Data | null>(null);
  const [handle] = React.useState(() => delayRender('collector-spectra'));
  React.useEffect(() => {
    fetch(staticFile('quakescore-collector-spectra.json')).then((r) => r.json()).then((d) => { setData(d); continueRender(handle); });
  }, [handle]);

  const phoneG = useMemo(() => new THREE.BoxGeometry(0.5, 0.05, 1.0), []);
  const panelG = useMemo(() => new THREE.BoxGeometry(PW, PH, 0.02), []);
  const cone = useMemo(() => new THREE.ConeGeometry(0.045, 0.14, 12), []);

  const lines = useMemo(() => {
    if (!data) return null;
    return PANELS.map((p) => {
      const b = data.bands[p.id], n = b.horiz.length;
      const h = b.horiz.map((v, i) => toWorld(p, 0.04 + 0.92 * (i / (n - 1)), yOf(v)));
      const z = b.vert.map((v, i) => toWorld(p, 0.04 + 0.92 * (i / (n - 1)), yOf(v)));
      const base = [toWorld(p, 0.04, 0.12), toWorld(p, 0.96, 0.12)];
      return { h: lineObj(h, pal.accent), z: lineObj(z, pal.mute, 0.7), base: lineObj(base, pal.e1) };
    });
  }, [data, pal]);

  // axes from the phone centre: x across, y along the phone, z up (device frame of a phone lying face up)
  // the phone is turned 35 degrees about the vertical so x and y read apart on screen; z = x cross y (right-handed)
  const TH = (35 * Math.PI) / 180;
  const axes: { name: string; dir: [number, number, number] }[] = [
    { name: 'x', dir: [Math.cos(TH), 0, -Math.sin(TH)] }, { name: 'y', dir: [-Math.sin(TH), 0, -Math.cos(TH)] }, { name: 'z', dir: [0, 1, 0] },
  ];
  const L = 0.85;
  const axisLines = useMemo(() => axes.map((a) => lineObj([PHONE, [PHONE[0] + a.dir[0] * L, PHONE[1] + a.dir[1] * L, PHONE[2] + a.dir[2] * L]], '#ffffff')), []);
  const glow = (i: number) => 0.5 + 0.5 * Math.cos(2 * Math.PI * (phase * 2 - i / 3)); // two passes per loop
  const tri = (u: number) => 1 - Math.abs(2 * (((u % 1) + 1) % 1) - 1); // continuous back-and-forth

  if (!data || !lines) return null;
  const sp = (p: [number, number, number]) => toScreen(p, CAM, width, height);
  const lab = labelStyle(pal, k);
  return (
    <Stage theme={theme} cam={CAM} grid={{ size: 16, divisions: 32 }}
      overlay={<>
        <div style={{ ...lab, position: 'absolute', left: 26 * k, top: 18 * k }}>
          <div style={{ color: pal.ink }}>Collector · one phone at rest, three bands</div>
          <div>Spectra: page code on a synthetic test stream · simulated</div>
        </div>
        {PANELS.map((p) => {
          const b = data.bands[p.id];
          const s = sp(toWorld(p, 0, PH + 0.06));
          return <div key={p.id} style={{ ...lab, fontSize: 9.5 * k, position: 'absolute', left: s.x, top: s.y - 34 * k }}>
            <div style={{ color: pal.ink }}>{p.id} · {b.fs} Hz · k={b.k}</div>
            <div>0–{b.nyq} Hz · {(data.nfft / b.fs).toFixed(0)} s window</div>
          </div>;
        })}
        {axes.map((a, i) => {
          const s = sp([PHONE[0] + a.dir[0] * (L + 0.16), PHONE[1] + a.dir[1] * (L + 0.16), PHONE[2] + a.dir[2] * (L + 0.16)]);
          return <div key={a.name} style={{ ...lab, position: 'absolute', left: s.x - 4 * k, top: s.y - 9 * k, color: mix(pal.mute, pal.accent, glow(i)) }}>{a.name}</div>;
        })}
        {(() => {
          const p = PANELS[1], h = data.bands.M.horiz, n = h.length;
          const im = h.indexOf(Math.max(...h));
          const uu = 0.04 + 0.92 * (im / (n - 1)), a = sp(toWorld(p, uu, yOf(h[im]) + 0.06)), b2 = sp(toWorld(p, uu, -0.08));
          const fz = ((im * 8 + 4.5) * data.bands.M.df).toFixed(1);
          return <>
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
              <path d={`M${a.x} ${a.y}V${b2.y}H${a.x + 24 * k}`} strokeDasharray={`${2 * k} ${3 * k}`} fill="none" stroke={pal.mute} strokeWidth={k} />
            </svg>
            <div style={{ ...lab, fontSize: 9.5 * k, position: 'absolute', left: a.x + 28 * k, top: b2.y - 9 * k, color: pal.ink }}>test tone ~{fz} Hz</div>
          </>;
        })()}
        <div style={{ ...lab, fontSize: 9.5 * k, position: 'absolute', left: 26 * k, bottom: 16 * k }}>
          <div><span style={{ display: 'inline-block', width: 18 * k, height: 0, borderTop: `${1.5 * k}px solid ${pal.accent}`, verticalAlign: 'middle', marginRight: 8 * k }} />horizontal (x+y)/2
            <span style={{ display: 'inline-block', width: 18 * k, height: 0, borderTop: `${1.5 * k}px solid ${pal.mute}`, verticalAlign: 'middle', margin: `0 ${8 * k}px 0 ${18 * k}px` }} />vertical z</div>
          <div>2048-point windows · log power · phone sensor {data.fsRaw.toFixed(2)} Hz</div>
        </div>
      </>}>
      {PANELS.map((p, i) => {
        const u = 0.04 + 0.92 * tri(phase + i / 3);
        const b = data.bands[p.id], n = b.horiz.length;
        const idx = Math.min(n - 1, Math.max(0, Math.round(((u - 0.04) / 0.92) * (n - 1))));
        const dot = toWorld(p, u, yOf(b.horiz[idx]));
        const cur = lineObj([toWorld(p, u, 0.12), toWorld(p, u, PH - 0.08)], pal.e1);
        return (
          <group key={p.id}>
            <Solid geometry={panelG} fill={pal.f0} edge={pal.e1} position={[p.x, PH / 2, p.z]} rotation={[0, p.ry, 0]} />
            <group position={[0, 0, 0]}>
              <primitive object={lines[i].base} />
              <primitive object={lines[i].z} />
              <primitive object={lines[i].h} />
              <primitive object={cur} />
            </group>
            <mesh position={dot}><sphereGeometry args={[0.035, 12, 8]} /><meshBasicMaterial color={pal.accent} /></mesh>
          </group>
        );
      })}
      <Solid geometry={phoneG} fill={pal.f1} edge={pal.ink} position={PHONE} rotation={[0, TH, 0]} />
      {axes.map((a, i) => {
        const c = mix(pal.e1, pal.accent, glow(i));
        axisLines[i].material = new THREE.LineBasicMaterial({ color: c });
        const tip: [number, number, number] = [PHONE[0] + a.dir[0] * L, PHONE[1] + a.dir[1] * L, PHONE[2] + a.dir[2] * L];
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...a.dir));
        return <group key={a.name}>
          <primitive object={axisLines[i]} />
          <mesh geometry={cone} position={tip} quaternion={q}><meshBasicMaterial color={c} /></mesh>
        </group>;
      })}
    </Stage>
  );
};
export default Scene;
