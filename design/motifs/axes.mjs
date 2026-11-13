// Motif: a phone lying flat on a surface, seen from the side, with its three accelerometer axes
// (X, Y, Z) drawn as faint, slowly changing traces above it. A slow scan line stands for the
// windows the page cuts from those traces.
export default function motif({ t, x, y, w, h, rng }) {
  const base = y + h - 6;                 // the surface the phone rests on
  const ph = Math.max(5, Math.round(h * 0.045));
  const top = y + 20, bottom = base - ph - 12;
  const lane = (bottom - top) / 3;
  const amp = lane * 0.2;
  const x0 = x + 18, x1 = x + w, n = 40;
  const trace = (seed) => {
    const r = rng(seed);
    const raw = Array.from({ length: n + 2 }, () => r() - 0.5);
    return Array.from({ length: n }, (_, i) => (raw[i] + raw[i + 1] + raw[i + 2]) / 1.5);
  };
  const path = (cy, v) => 'M' + v.map((q, i) => `${(x0 + (i / (n - 1)) * (x1 - x0)).toFixed(1)} ${(cy + q * amp * 2).toFixed(1)}`).join('L');
  const axes = ['x', 'y', 'z'].map((name, k) => {
    const cy = top + lane * (k + 0.5);
    const a = path(cy, trace(11 + k)), b = path(cy, trace(41 + k)), c = path(cy, trace(71 + k));
    const dur = 10 + k * 3;
    return `<text x="${x}" y="${(cy + 3.5).toFixed(1)}" class="m mute" font-size="9">${name}</text>
<path fill="none" stroke="${k === 2 ? t.ink : t.mute}" stroke-width="1" stroke-linejoin="round" opacity="${k === 2 ? 0.8 : 0.6}" d="${a}"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.33;0.66;1" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1" values="${a};${b};${c};${a}"/></path>`;
  }).join('\n');
  const pw = w * 0.46, px = x + (w - pw) / 2 + w * 0.06;
  const scanW = Math.max(18, w * 0.12);
  return `<text x="${x}" y="${y + 6}" class="m mute" font-size="10">devicemotion · 3 axes</text>
<text x="${x + w}" y="${y + 6}" class="m mute" font-size="9" text-anchor="end">flat, still</text>
<rect x="${x0}" y="${top - 4}" width="${scanW.toFixed(1)}" height="${(bottom - top + 8).toFixed(1)}" fill="${t.faint}" stroke="${t.rule}" stroke-dasharray="2 3" style="--d:${(x1 - x0 - scanW).toFixed(1)}px;animation:sweep 18s ease-in-out infinite alternate"/>
${axes}
<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${t.rule}"/>
<rect x="${px.toFixed(1)}" y="${base - ph}" width="${pw.toFixed(1)}" height="${ph}" rx="${(ph / 2).toFixed(1)}" fill="${t.panel}" stroke="${t.ink}" stroke-width="1"/>
<line x1="${(px + pw * 0.3).toFixed(1)}" y1="${base - ph - 0.5}" x2="${(px + pw * 0.7).toFixed(1)}" y2="${base - ph - 0.5}" stroke="${t.accent}" class="pulse"/>`;
}
