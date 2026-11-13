// Motif: six collectors feed one report. Every line carries a tick: no claim reaches the report without a citation.
export default function motif({ t, x, y, w, h }) {
  const f = (v) => v.toFixed(1);
  const top = y + 20, bot = y + h - 8;
  const sx = x + 5;
  const docW = Math.min(24, w * 0.08), docH = Math.min(32, (bot - top) * 0.42);
  const dx = x + w - docW - 2, dy = (top + bot) / 2 - docH / 2;
  const tx = dx, ty = (top + bot) / 2;
  const cub = (p0, p1, p2, p3, u) => (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u ** 2 * p2 + u ** 3 * p3;
  const dur = 9;
  let out = '';
  for (let i = 0; i < 6; i++) {
    const sy = top + (i * (bot - top)) / 5;
    const c1x = sx + (tx - sx) * 0.5, c2x = tx - (tx - sx) * 0.35;
    const d = `M${f(sx)} ${f(sy)}C${f(c1x)} ${f(sy)} ${f(c2x)} ${f(ty)} ${f(tx)} ${f(ty)}`;
    // citation tick across each line, staggered so the ticks read one per line
    const u = 0.34 + (i % 3) * 0.08, e = 0.01;
    const px = cub(sx, c1x, c2x, tx, u), py = cub(sy, sy, ty, ty, u);
    const qx = cub(sx, c1x, c2x, tx, u + e), qy = cub(sy, sy, ty, ty, u + e);
    const len = Math.hypot(qx - px, qy - py) || 1;
    const nx = (-(qy - py) / len) * 3.5, ny = ((qx - px) / len) * 3.5;
    const begin = -((i * dur) / 6).toFixed(2);
    out += `<path d="${d}" fill="none" stroke="${t.rule}"/>
<path d="M${f(px - nx)} ${f(py - ny)}L${f(px + nx)} ${f(py + ny)}" stroke="${t.mute}" stroke-width="1.2"/>
<circle cx="${f(sx)}" cy="${f(sy)}" r="3" fill="${t.bg}" stroke="${t.ink}" class="pulse" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>
<circle r="2" fill="${t.accent}" opacity="0"><animateMotion path="${d}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.08;0.55;0.62;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
  }
  const lines = [0.3, 0.5, 0.7].map((v, k) => `<line x1="${f(dx + 5)}" y1="${f(dy + docH * v)}" x2="${f(dx + docW - (k === 2 ? 10 : 5))}" y2="${f(dy + docH * v)}" stroke="${t.ink}" class="pulse" style="animation-delay:${k * 1.3}s"/>`).join('');
  return `${out}
<rect x="${f(dx)}" y="${f(dy)}" width="${f(docW)}" height="${f(docH)}" rx="1.5" fill="${t.panel}" stroke="${t.accent}" stroke-width="1.2"/>${lines}
<text x="${x}" y="${y + 6}" class="m mute" font-size="9.5">six collectors</text>
<text x="${x + w}" y="${y + 6}" class="m mute" font-size="9.5" text-anchor="end">one cited report</text>`;
}
