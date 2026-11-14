// cea-reduce: one figure, three beats, white background.
// Claim: cea shrinks a failing program to the lines that still fail, re-checks the result, and then shows the one
//        instruction the culprit pass changed.
// 1. The program itself as data: examples/04-crash-reduction/crash.c, 88 lines (README: "88 lines (2438 bytes)").
//    One bar per line, length = the line's real length in characters (read from the file); blank lines have no bar.
//    Colour = kind of line: comment slate, preprocessor purple, type and table declarations teal, function code blue.
// 2. The reduction, replayed: reduce_testcase used the built-in line reducer, ddminLines in src/core/interesting.ts
//    (README: "Reduced from 88 lines ... to 2 lines ... with builtin in 25 tests"). The loop below is that function,
//    run on the same 89 split elements (88 lines + the empty string after the final newline), with "interesting" = the
//    candidate still holds the two lines the recorded result kept (line 12, the SATURATE macro, and line 77, its use).
//    It takes exactly 25 tests and leaves exactly those 2 lines: the replay agrees with the record.
//    The compiler was NOT re-run here; accepted/rejected per test is that model, not a log (the record keeps no per-test log).
//    Green flash = a test that still crashed (chunk deleted), coral flash = a test that lost the crash (chunk kept).
// 3. Proof: lines before -> after for the two recorded reductions (no target exists, the numbers are pinned):
//    04 crash.c 88 -> 2 (README 04); 05 alias.c 18 -> 10 (README 05, "[5] reduce_testcase ok reduced 18 -> 10 lines").
//    Which 10 lines of alias.c survived is not recorded, so its "after" column is a count only (blue, not per-line colour).
//    And the IR before and after the culprit pass of example 05 (README 05 diff, instcombine on store_both): the load and
//    `ret i32 %3` become `ret i32 1` (amber). Bar length = the IR line's real length in characters.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Stage, Axes3D, AxisLabels, Bar, Tube, Caption, Source, Name, Pin, C, SANS, usePhase, project, ease, span, norm, mix, TAU, type Cam, type Axis, type Box } from '../kit4';

// crash.c: line lengths and kinds (c comment, p preprocessor, d declaration, f function code, _ blank)
const LENS = [81, 77, 79, 78, 19, 19, 0, 49, 41, 41, 50, 69, 0, 16, 21, 8, 0, 16, 15, 16, 14, 8, 0, 33, 14, 14, 14, 2, 0, 36, 15, 19, 15, 19, 15, 11, 1, 0, 56, 40, 1, 0, 26, 52, 1, 0, 44, 44, 45, 65, 31, 24, 31, 32, 17, 5, 3, 1, 0, 41, 48, 49, 18, 55, 60, 73, 33, 53, 19, 5, 3, 1, 0, 39, 57, 29, 44, 49, 49, 3, 1, 0, 37, 19, 55, 53, 13, 2];
const KINDS = 'ccccpp_ppppp_ddd_ddddd_ddddd_ffffffff_fff_fff_ffffffffffff_fffffffffffff_ffffffff_ffffff';
const KCOL: Record<string, string> = { c: C.slate, p: C.purple, d: C.teal, f: C.blue, _: C.quiet };
const N = 89; // split elements, the last one is the empty string after the final newline
const KEEP = [11, 76]; // 0-based: line 12 and line 77

// replay of ddminLines (src/core/interesting.ts), same loop, same chunk schedule
type Test = { idx: number[]; ok: boolean };
const TESTS: Test[] = (() => {
  let lines = Array.from({ length: N }, (_, i) => i);
  const out: Test[] = [];
  let chunk = Math.max(1, Math.floor(lines.length / 2));
  while (chunk >= 1) {
    let removedAny = false; let i = 0;
    while (i < lines.length) {
      const cand = [...lines.slice(0, i), ...lines.slice(i + chunk)];
      if (cand.length === lines.length) break;
      const ok = KEEP.every((k) => cand.includes(k));
      out.push({ idx: lines.slice(i, i + chunk), ok });
      if (ok) { lines = cand; removedAny = true; } else i += chunk;
    }
    if (chunk === 1 && !removedAny) break;
    if (!removedAny || chunk > 1) chunk = chunk === 1 ? 1 : Math.floor(chunk / 2);
  }
  return out;
})(); // 25 tests, leaves [11, 76]
const GONE_AT: number[] = Array(N).fill(-1);
TESTS.forEach((t, j) => { if (t.ok) t.idx.forEach((i) => { GONE_AT[i] = j; }); });

// example 05: the culprit pass's IR, before and after (README 05)
const IR_BEFORE = [
  'define dso_local i32 @store_both(ptr noundef %0, ptr noundef %1) local_unnamed_addr #0 {',
  '  store i32 1, ptr %0, align 4, !tbaa !12',
  '  store float 2.000000e+00, ptr %1, align 4, !tbaa !13',
  '  %3 = load i32, ptr %0, align 4, !tbaa !12',
  '  ret i32 %3',
  '}',
];
const IR_AFTER = [IR_BEFORE[0], IR_BEFORE[1], IR_BEFORE[2], '  ret i32 1', '}'];
const CHANGED_BEFORE = [3, 4], CHANGED_AFTER = [3];

// the page: crash.c lying on the floor, line 1 at the back
const PG: Box = [6.2, 0.6, 5.6];
const PO: [number, number, number] = [-7.4, 0, 2.8];
const px: Axis = { min: 0, max: 84, ticks: [0, 40, 80], title: 'characters' };
const pz: Axis = { min: 89, max: 0, ticks: [1, 30, 60, 88], title: 'line' };
const py: Axis = { min: 0, max: 1, ticks: [], title: '' };
// proof: columns of line slabs
const CB: Box = [3.0, 2.5, 0.6];
const CO: [number, number, number] = [1.0, 0, 0.6];
const cy: Axis = { min: 0, max: 90, ticks: [0, 30, 60, 90], title: 'lines' };
const cx: Axis = { min: 0, max: 1, ticks: [], title: '' };
const COLS = [
  { ex: '04', before: 88, after: 2, xf: 0.2 },
  { ex: '05', before: 18, after: 10, xf: 0.68 },
];
// IR wall
const IRK = 0.027, IRH = 0.16, IRS = 0.3;
const IRB: [number, number, number] = [4.9, 2.35, 0.3];
const IRA: [number, number, number] = [7.55, 2.35, 0.3];

const camAt = (p: number): Cam => {
  const pr = span(p, 0.665, 0.965, 0.06);
  const a = -0.18 + 0.07 * Math.sin(TAU * p) + 0.16 * pr;
  const R = 17.0 - 0.8 * pr, el = 0.8 - 0.44 * pr;
  const tx = -4.2 + 10.2 * pr, ty = -0.55 + 1.75 * pr, tz = 0.0 - 0.1 * pr;
  return { position: [tx + R * Math.cos(el) * Math.sin(a), ty + R * Math.sin(el), tz + R * Math.cos(el) * Math.cos(a)], target: [tx, ty, tz], fov: 25 };
};

const Scene: React.FC = () => {
  const p = usePhase();
  const { width, height } = useVideoConfig();
  const k = width / 960;
  const cam = camAt(p);
  const P = (q: [number, number, number]) => project(q, cam, width, height);
  const reset = 1 - ease((p - 0.955) / 0.04);

  // beat 2 clock: one slot per test
  const T0 = 0.345, DT = 0.0112;
  const tj = (p - T0) / DT; // tests elapsed (fractional)
  const b3 = span(p, 0.675, 0.955, 0.03);
  const c1 = span(p, 0.015, 0.31), c2 = span(p, 0.325, 0.655), c3 = span(p, 0.675, 0.955);
  const pageA = 1 - span(p, 0.7, 0.99, 0.04);
  const survLift = ease((p - (T0 + 25 * DT + 0.01)) / 0.04) * reset;

  const zOf = (i: number) => norm(pz, i + 1);
  const lineWorld = (i: number, y: number): [number, number, number] => [PO[0] + (LENS[i] / 84) * PG[0] + 0.15, y, PO[2] - zOf(i) * PG[2]];
  const testsDone = Math.max(0, Math.min(25, Math.floor(tj + 1)));

  return (
    <Stage cam={cam}
      overlay={<>
        <Name text="cea" />
        <div style={{ opacity: Math.max(0, (pageA - 0.2) / 0.8) }}><AxisLabels cam={cam} size={PG} origin={PO} x={px} y={py} z={pz} /></div>
        {b3 > 0.02 ? <div style={{ opacity: b3 }}>
          <AxisLabels cam={cam} size={CB} origin={CO} x={cx} y={cy} />
          {COLS.map((c) => {
            const xb = CO[0] + (c.xf) * CB[0], xa = CO[0] + (c.xf + 0.17) * CB[0];
            const tb = P([xb, (c.before / 90) * CB[1], CO[2] - CB[2] / 2]);
            const ta = P([xa, (c.after / 90) * CB[1], CO[2] - CB[2] / 2]);
            const foot = P([(xb + xa) / 2, 0, CO[2] + 0.1]);
            return <React.Fragment key={c.ex}>
              <Pin at={tb} text={String(c.before)} color={C.mute} size={15} />
              <Pin at={ta} text={String(c.after)} color={C.ink} size={17} />
              <div style={{ position: 'absolute', left: foot.x, top: foot.y + 8 * k, transform: 'translate(-50%,0)', fontFamily: SANS, fontSize: 11 * k, fontWeight: 600, color: C.mute }}>{c.ex}</div>
            </React.Fragment>;
          })}
          {(() => {
            const q = P([IRA[0] + IR_AFTER[3].length * IRK + 0.1, IRA[1] - 3 * IRS, IRA[2]]);
            return <div style={{ position: 'absolute', left: q.x, top: q.y, transform: 'translate(0,-50%)', fontFamily: "ui-monospace,'Cascadia Mono',Consolas,monospace", fontWeight: 700, fontSize: 14 * k, color: mix(C.amber, C.ink, 0.25), whiteSpace: 'nowrap', opacity: ease((p - 0.76) / 0.03) }}>ret i32 1</div>;
          })()}
          {(() => {
            const qb = P([IRB[0] + 1.1, IRB[1] + 0.35, IRB[2]]), qa = P([IRA[0] + 1.1, IRA[1] + 0.35, IRA[2]]);
            const st: React.CSSProperties = { position: 'absolute', transform: 'translate(-50%,-50%)', fontFamily: SANS, fontSize: 11 * k, fontWeight: 600, color: C.mute };
            return <><div style={{ ...st, left: qb.x, top: qb.y }}>IR before</div><div style={{ ...st, left: qa.x, top: qa.y }}>after</div></>;
          })()}
        </div> : null}
        {/* beat 2 pins: the test counter and the two survivors */}
        <Pin at={P([PO[0] + PG[0] * 0.02, 0.1, PO[2] - PG[2] * 1.04])} text={`test ${testsDone}/25`} color={C.mute} size={13} opacity={span(p, 0.345, 0.66, 0.02)} />
        <Pin at={P(lineWorld(11, 0.62))} text="line 12" color={C.purple} size={13} opacity={survLift * span(p, 0.3, 0.68, 0.02)} dy={-2} />
        <Pin at={P(lineWorld(76, 0.62))} text="line 77" color={C.blue} size={13} opacity={survLift * span(p, 0.3, 0.68, 0.02)} dy={-2} />
        <Caption step={1} of={3} opacity={c1} text="88 lines that crash clang." />
        <Source opacity={c1} text="examples/04 crash.c · recorded run, clang 23.1.5" />
        <Caption step={2} of={3} opacity={c2} text="Delete lines while the crash stays." />
        <Source opacity={c2} text="replay of ddminLines: 25 tests, as recorded" />
        <Caption step={3} of={3} opacity={c3} text="Fewer lines, one instruction changed." />
        <Source opacity={c3} text="examples 04 and 05 · recorded runs, not re-run here" />
      </>}>
      {pageA > 0.05 ? <Axes3D size={PG} origin={PO} x={px} y={py} z={pz} /> : null}
      {LENS.map((len, i) => {
        if (len === 0) return null;
        const grow = ease((p - 0.03 - (i / 88) * 0.2) / 0.04) * reset;
        if (grow < 0.01) return null;
        const g = GONE_AT[i];
        const kept = KEEP.includes(i);
        // flashes: is this line in the chunk of the test running now?
        let flash = 0, flashCol = C.green;
        TESTS.forEach((t, j) => {
          if (!t.idx.includes(i)) return;
          const u = tj - j;
          if (u > -0.05 && u < 1.0) { const f = Math.sin(Math.PI * Math.max(0, Math.min(1, u))); if (f > flash) { flash = f; flashCol = t.ok ? C.green : C.coral; } }
        });
        const goneT = g >= 0 ? ease((tj - g - 0.6) / 0.8) : 0;
        const base = KCOL[KINDS[i]] ?? C.blue;
        let col = mix(base, C.quiet, goneT * 0.85);
        col = mix(col, flashCol, flash * (1 - goneT));
        const h = 0.18 * (1 - 0.8 * goneT) + (kept ? 0.6 * survLift : 0);
        const lift = kept ? 0.25 * survLift : 0;
        return <Bar key={i} size={PG} origin={PO} xFrac={(len / 84) * 0.5 * grow} zFrac={zOf(i)} base={lift / PG[1]} hFrac={h * grow} w={(len / 84) * grow} d={0.62 / 89} color={col} opacity={pageA} />;
      })}

      {b3 > 0.02 ? <>
        <Axes3D size={CB} origin={CO} x={cx} y={cy} />
        {COLS.map((c, ci) => {
          const slab = CB[1] / 90;
          const out: React.ReactNode[] = [];
          for (let s = 0; s < c.before; s++) {
            const g = ease((p - 0.69 - ci * 0.02 - s * 0.0007) / 0.03) * reset;
            if (g < 0.01) continue;
            out.push(<Bar key={'b' + s} size={CB} origin={CO} xFrac={c.xf} zFrac={0.5} base={(s * slab) / CB[1]} hFrac={(slab * 0.72 * g) / CB[1]} w={0.13} d={0.8} color={mix(C.quiet, C.slate, 0.25)} />);
          }
          for (let s = 0; s < c.after; s++) {
            const g = ease((p - 0.72 - ci * 0.02 - s * 0.003) / 0.03) * reset;
            if (g < 0.01) continue;
            const col = c.ex === '04' ? (s === 0 ? C.purple : C.blue) : C.blue;
            out.push(<Bar key={'a' + s} size={CB} origin={CO} xFrac={c.xf + 0.17} zFrac={0.5} base={(s * slab) / CB[1]} hFrac={(slab * 0.72 * g) / CB[1]} w={0.13} d={0.8} color={col} />);
          }
          return <React.Fragment key={c.ex}>{out}</React.Fragment>;
        })}
        {[{ o: IRB, L: IR_BEFORE, ch: CHANGED_BEFORE, t: 0.72 }, { o: IRA, L: IR_AFTER, ch: CHANGED_AFTER, t: 0.74 }].map((S, si) => (
          <React.Fragment key={si}>
            {S.L.map((line, li) => {
              const g = ease((p - S.t - li * 0.006) / 0.03) * reset;
              if (g < 0.01) return null;
              const len = line.length * IRK;
              const changed = S.ch.includes(li);
              const col = changed ? (si === 0 ? mix(C.amber, '#FFFFFF', 0.45) : C.amber) : mix(C.slate, '#FFFFFF', 0.2);
              return <mesh key={li} position={[S.o[0] + (len * g) / 2, S.o[1] - li * IRS, S.o[2]]} scale={[Math.max(0.001, len * g), IRH, 0.12]}>
                <boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={col} />
              </mesh>;
            })}
          </React.Fragment>
        ))}
        {(() => {
          const t = ease((p - 0.77) / 0.05) * reset;
          if (t < 0.03) return null;
          const a: [number, number, number] = [IRB[0] + IR_BEFORE[3].length * IRK + 0.05, IRB[1] - 3.5 * IRS, IRB[2]];
          const b: [number, number, number] = [IRA[0] - 0.05, IRA[1] - 3 * IRS, IRA[2]];
          const n = 14, m = Math.max(2, Math.round(n * t));
          const pts = Array.from({ length: m + 1 }, (_, j) => { const u = j / n; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 0.35 * Math.sin(Math.PI * u), a[2] + 0.2 * Math.sin(Math.PI * u)] as [number, number, number]; });
          return <Tube points={pts} color={C.amber} radius={0.022} />;
        })()}
      </> : null}
    </Stage>
  );
};
export default Scene;
