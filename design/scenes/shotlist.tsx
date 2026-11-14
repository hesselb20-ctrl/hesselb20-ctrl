// shotlist: one figure, three beats, white background. A long shallow timeline of the test clip, sliced by its cuts.
// Claim: it finds every cut to the frame and knows which ones sit on the beat (one synthetic test clip, no real video).
// Data: public/shotlist-v4.json, extracted from the repository (read-only):
//   envelope (450 values, 0..1, one per video frame), onsets (29, frame + strength), bpm 120.2, shots (9, start/end frame,
//     cutOnBeat), detection.beatToleranceFrames = 2                   <- samples/test-clip.shotlist.json
//   scene (450 values): ffmpeg scene score per frame of samples/test-clip.mp4, same filter as cli/src/media.ts detectCuts
//     (cut = score > 0.3; the 8 cut frames score 0.46..0.89, every other frame <= 0.024)
//   truth (8 cut frames): scripts/make-test-clip.mjs shot durations [1.5,1.5,0.8,1.2,1.3,1.7,2,2,3] s x 30 fps
//     -> 45, 90, 114, 150, 189, 240, 300, 360; the script says the 3.8 s and 6.3 s cuts are deliberately off the beat.
//   On beat (cli/src/analyze.ts): a cut within 2 frames of a detected onset. Off-beat cuts 114 and 189 are 6 frames from
//     their nearest onset (120, 195). README (readme-redesign): re-running analyze reproduces the JSON byte for byte.
// 1. Raw signals: the picture-change score and the audio loudness envelope along 450 frames, no structure.
// 2. Cuts and beats found: planes drop in at the detected cut frames, the beat comb locks at 120.2 BPM, shots get a hue.
// 3. Proof: generator's true cut frames land exactly on the planes (0 frames off, 8 of 8); 6 of 8 cuts on a beat,
//    the two off-beat cuts shown in coral with their 6-frame gap to the nearest onset.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, staticFile, useVideoConfig, delayRender, continueRender } from 'remotion';
import { Stage, Axes3D, AxisLabels, Ridge, Bar, Tube, Target, Caption, Source, Name, Pin, C, usePhase, project, ease, span, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

type D = {
  fps: number; total: number; bpm: number; tolerance: number; threshold: number;
  envelope: number[]; onsets: { frame: number; strength: number }[]; scene: number[];
  shots: { start: number; end: number; onBeat: boolean }[]; cuts: number[]; truth: number[]; nearestOnset: number[];
};
const SX = 12, SZ = 2.4;
const FO: [number, number, number] = [-6, 0, 1.2];
// lanes along depth (fraction of SZ): shots strip at the front, beat comb, audio ridge, picture-change ridge at the back
const Z_SHOT = 0.07, Z_COMB = 0.25, Z_AUDIO = 0.45, Z_PIC = 0.85;
const H_AUDIO = 1.75, H_PIC = 2.2;
const SHOT_HUES = [C.teal, C.purple, C.sand, C.rose, C.slate, C.brown, C.sky, C.purple, C.teal];

const camAt = (p: number): Cam => {
  const proof = span(p, 0.67, 0.955, 0.06);
  const az = -0.13 + 0.05 * Math.sin(TAU * p) + 0.07 * proof;
  const R = 15.6 - 0.5 * proof, el = 0.4 + 0.03 * proof;
  const tx = 0.35 - 0.1 * proof;
  return { position: [tx + R * Math.cos(el) * Math.sin(az), 0.6 + R * Math.sin(el), R * Math.cos(el) * Math.cos(az)], target: [tx, 0.95, 0], fov: 27 };
};

/** A thin vertical plane across the depth of the timeline at one frame. */
const CutPlane: React.FC<{ x: number; h: number; color: string; opacity: number }> = ({ x, h, color, opacity }) => {
  const rim = useMemo(() => new THREE.BufferGeometry().setFromPoints([[0, 0], [0, 1], [-1, 1], [-1, 0]].map(([a, b]) => new THREE.Vector3(0, b, a))), []);
  if (h < 0.01) return null;
  return (
    <group position={[x, 0, FO[2] + 0.15]} scale={[1, h, SZ + 0.3]}>
      <mesh position={[0, 0.5, -0.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={color} transparent opacity={0.22 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <line geometry={rim}><lineBasicMaterial color={color} transparent opacity={opacity} /></line>
    </group>
  );
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const [d, setD] = React.useState<D | null>(null);
  const [hd] = React.useState(() => delayRender('shotlist'));
  React.useEffect(() => { fetch(staticFile('shotlist-v4.json')).then((r) => r.json()).then((j) => { setD(j); continueRender(hd); }); }, [hd]);
  if (!d) return <AbsoluteFill style={{ background: C.bg }} />;
  const cam = camAt(p);
  const N = d.total;
  const X = (f: number) => FO[0] + (f / (N - 1)) * SX;
  const Zw = (zf: number) => FO[2] - zf * SZ;
  const reset = 1 - ease((p - 0.955) / 0.04);
  const b2 = span(p, 0.345, 0.955, 0.04), b3 = span(p, 0.68, 0.955, 0.04);
  const c1 = span(p, 0.015, 0.325), c2 = span(p, 0.345, 0.655), c3 = span(p, 0.675, 0.955);

  // beat 1: a playhead sweeps the 450 frames and both raw signals grow behind it
  const head = ease((p - 0.03) / 0.26) * (N + 30);
  const shown = (i: number) => ease((head - i) / 30) * reset;
  const env = d.envelope.map((v, i) => v * shown(i));
  const pic = d.scene.map((v, i) => Math.min(1, v) * shown(i));

  const ax: Axis = { min: 0, max: N - 1, ticks: [0, 90, 180, 270, 360, 449], title: 'frame', fmt: (v) => String(v === 449 ? 450 : v) };
  const lanes: Record<number, string> = { [Z_SHOT]: 'shots', [Z_COMB]: 'beats', [Z_AUDIO]: 'audio', [Z_PIC]: 'picture' };
  const az: Axis = { min: 0, max: 1, ticks: [Z_SHOT, Z_COMB, Z_AUDIO, Z_PIC], title: '', fmt: (v) => lanes[v] ?? '' };
  const ay: Axis = { min: 0, max: 1, ticks: [], title: '' };
  const BOX: Box = [SX, H_PIC, SZ];

  // beat 2: cut planes drop in; the comb's period settles from a guess to the measured tempo, then cuts take green/coral
  const period = (d.fps * 60) / d.bpm; // 14.975 frames
  const lock = ease((p - 0.44) / 0.12);
  const per = period * (1.22 - 0.22 * lock);
  const combOn = ease((p - 0.4) / 0.04) * b2;
  const judged = ease((p - 0.57) / 0.06);
  const split = ease((p - 0.38) / 0.08) * b2;
  const thrOn = ease((p - 0.35) / 0.05) * b2;
  const teeth = Array.from({ length: Math.floor((N - 1) / period) + 1 }, (_, k) => k * per).filter((f) => f <= N - 1);

  // beat 3: generator's true cut frames, and the gap from each cut to its nearest onset
  const truthOn = (i: number) => ease((p - 0.7 - i * 0.012) / 0.04) * b3;
  const gapOn = ease((p - 0.78) / 0.06) * b3;
  const nOn = d.shots.filter((s) => s.onBeat).length;
  const errs = d.cuts.map((c, i) => c - d.truth[i]);
  const allExact = errs.every((e) => e === 0);
  const offIdx = d.cuts.map((_, i) => i).filter((i) => !d.shots[i + 1].onBeat);

  const P = (pt: [number, number, number]) => project(pt, cam, width, height);
  const truthPin = P([X(405), 0, Zw(-0.08)]);
  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="shotlist" />
        <AxisLabels cam={cam} size={BOX} origin={FO} x={ax} y={ay} z={az} />
        {combOn > 0.05 && c2 > 0.02 ? <Pin at={P([X(teeth[1]), 1.95, Zw(Z_AUDIO)])} text={`${d.bpm} BPM`} color={C.blue} size={14} opacity={c2 * lock} dy={-4} /> : null}
        {b3 > 0.02 ? <>
          <Pin at={truthPin} text={allExact ? `${d.cuts.length} of ${d.cuts.length} cuts: 0 frames off` : `max ${Math.max(...errs.map(Math.abs))} frames off`} color={C.ink} size={13} opacity={truthOn(7)} dy={34} />
          <Pin at={P([X(d.cuts[0]), 2.55, Zw(0.5)])} text={`${nOn} of ${d.cuts.length} on beat`} color={C.green} size={16} opacity={ease((p - 0.74) / 0.05) * b3} />
          {offIdx.map((i) => <Pin key={i} at={P([X((d.cuts[i] + d.nearestOnset[i]) / 2), d.envelope[d.nearestOnset[i]] * H_AUDIO + 0.1, Zw(Z_AUDIO)])} text={`${Math.abs(d.nearestOnset[i] - d.cuts[i])} frames`} color={C.coral} size={13} opacity={gapOn} />)}
        </> : null}
        <Caption step={1} of={3} opacity={c1} text="Raw signals: picture change, audio loudness." />
        <Source opacity={c1} text={`samples/test-clip.mp4 · ${N} frames · synthetic`} />
        <Caption step={2} of={3} opacity={c2} text={`Cuts found, beats locked at ${d.bpm} BPM.`} />
        <Source opacity={c2} text={`test-clip.shotlist.json · ${d.cuts.length} cuts · ${d.onsets.length} onsets`} />
        <Caption step={3} of={3} opacity={c3} text="Every cut exact. Two land off beat." />
        <Source opacity={c3} text="vs make-test-clip.mjs · one synthetic clip, no real video" />
      </>}>
      <Axes3D size={BOX} origin={FO} x={ax} y={ay} z={az} />
      {/* picture change (back) and audio envelope (middle): the raw signals */}
      {pic.map((v, i) => v > 0.004 ? <Bar key={'pc' + i} size={[1, 1, 1]} origin={[0, 0, 0]} xFrac={X(i)} zFrac={-Zw(Z_PIC)} hFrac={v * H_PIC} w={0.055} d={0.1} color={C.purple} /> : null)}
      <Ridge ys={pic} size={[SX, H_PIC, SZ]} zFrac={Z_PIC} origin={FO} color={C.purple} fill={0} />
      <Ridge ys={env} size={[SX, H_AUDIO, SZ]} zFrac={Z_AUDIO} origin={FO} color={C.blue} fill={0.18} />
      {/* cut threshold 0.3 on the picture lane only */}
      {thrOn > 0.02 ? <group>
        <Target size={[SX, H_PIC, SZ * 0.1]} origin={[FO[0], 0, Zw(Z_PIC - 0.05)]} yFrac={d.threshold} color={C.slate} />
      </group> : null}
      {/* beat 1 playhead */}
      {head > 2 && head < N ? <Tube points={[[X(head), 0, Zw(Z_AUDIO)], [X(head), 1.15, Zw(Z_AUDIO)], [X(head), 2.3, Zw(Z_AUDIO)]]} color={C.slate} radius={0.012} opacity={0.8 * c1} /> : null}
      {/* the shots strip: one grey slab, then split into its 9 real shots */}
      {d.shots.map((s, i) => {
        const gap = 0.03 * split;
        const x0 = X(s.start) + gap, x1 = X(s.end) - gap;
        const col = mix(C.quiet, SHOT_HUES[i], split);
        return <Bar key={i} size={[1, 1, 1]} origin={[0, 0, 0]} xFrac={(x0 + x1) / 2} zFrac={-Zw(Z_SHOT)} hFrac={0.07} w={Math.max(0.01, x1 - x0)} d={0.32} color={col} />;
      })}
      {/* beat comb */}
      {combOn > 0.02 ? teeth.map((f, k) => <Bar key={'t' + k} size={[1, 1, 1]} origin={[0, 0, 0]} xFrac={X(f)} zFrac={-Zw(Z_COMB)} hFrac={0.3 * combOn * reset} w={0.028} d={0.08} color={mix(C.quiet, C.blue, lock)} />) : null}
      {/* cut planes at the detected frames */}
      {d.cuts.map((c, i) => {
        const drop = ease((p - 0.36 - i * 0.012) / 0.05) * b2;
        const on = d.shots[i + 1].onBeat;
        const col = mix(C.slate, on ? C.green : C.coral, judged);
        return <CutPlane key={c} x={X(c)} h={2.45 * drop} color={col} opacity={1} />;
      })}
      {/* where each cut meets the audio: a dot on the envelope, green on an onset peak, coral off it */}
      {judged > 0.02 ? d.cuts.map((c, i) => {
        const on = d.shots[i + 1].onBeat;
        return <mesh key={'h' + i} position={[X(c), d.envelope[c] * H_AUDIO * reset, Zw(Z_AUDIO)]} scale={judged * b2}><sphereGeometry args={[0.075, 16, 12]} /><meshLambertMaterial color={on ? C.green : C.coral} /></mesh>;
      }) : null}
      {/* proof: the gap from each off-beat cut to its nearest onset peak */}
      {gapOn > 0.02 ? offIdx.map((i) => {
        const c = d.cuts[i], o = d.nearestOnset[i], yc = d.envelope[c] * H_AUDIO, yp = d.envelope[o] * H_AUDIO, z = Zw(Z_AUDIO);
        const a = X(c), b = a + (X(o) - a) * gapOn, up = ease((p - 0.83) / 0.04) * b3;
        return <React.Fragment key={'gap' + i}>
          <Tube points={[[a, yc, z], [(a + b) / 2, yc, z], [b, yc, z]]} color={C.coral} radius={0.03} />
          {up > 0.02 ? <Tube points={[[X(o), yc, z], [X(o), yc + (yp - yc) * up * 0.5, z], [X(o), yc + (yp - yc) * up, z]]} color={C.coral} radius={0.03} /> : null}
        </React.Fragment>;
      }) : null}
      {/* proof: true cut frames from the generator script, as ink needles standing on the shots strip */}
      {d.truth.map((f, i) => {
        const t = truthOn(i);
        if (t < 0.02) return null;
        const zf = Zw(Z_SHOT);
        return <React.Fragment key={'g' + i}>
          <Tube points={[[X(f), 0.07, zf], [X(f), 0.07 + 0.5 * t, zf]]} color={C.ink} radius={0.018} />
          <mesh position={[X(f), 0.07 + 0.5 * t, zf]}><sphereGeometry args={[0.055, 16, 12]} /><meshLambertMaterial color={C.ink} /></mesh>
        </React.Fragment>;
      })}
    </Stage>
  );
};
export default Scene;
