// Motif: a commit history line is read left to right. A few commits are marked as decisions
// and each one gets a short record stub above the line, joined by a thin leader.
export default function motif({ t, x, y, w, h, rng }) {
  const T = 14; // seconds per loop
  const r = rng(11);
  const base = y + h - 22;
  const n = Math.max(12, Math.round(w / 15));
  const step = w / (n - 1);
  const xs = Array.from({ length: n }, (_, i) => x + i * step);
  const picks = [Math.round(n * 0.18), Math.round(n * 0.52), Math.round(n * 0.83)];
  const sw = Math.min(78, Math.round(w * 0.24)); // stub width
  const sh = 28;
  const top = y + 16;
  const lift = [0, Math.min(14, h - 96), 4]; // stagger stubs so leaders differ in length
  const scanEnd = 0.8; // fraction of the loop the read head takes to cross the line
  const f = (v) => v.toFixed(3);

  const commits = xs.map((cx, i) => `<circle cx="${cx.toFixed(1)}" cy="${base}" r="2.2" fill="${t.bg}" stroke="${t.mute}" stroke-width="1"/>`).join('');

  const marks = picks.map((pi, k) => {
    const cx = xs[pi];
    const sx = Math.max(x, Math.min(x + w - sw, cx - sw / 2));
    const sy = top + lift[k];
    const at = (pi / (n - 1)) * scanEnd; // the head reaches this commit
    const kt = `0;${f(at)};${f(Math.min(at + 0.05, 0.9))};0.92;0.97;1`;
    const op = `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt}" values="0;0;1;1;0;0"/>`;
    const lens = [0.78, 0.56, 0.36 + r() * 0.2];
    const lines = lens.map((l, j) => `<rect x="${(sx + 8).toFixed(1)}" y="${sy + 7 + j * 7}" width="${((sw - 16) * l).toFixed(1)}" height="2" fill="${j === 0 ? t.ink : t.mute}"/>`).join('');
    const leadLen = base - 4 - (sy + sh);
    return `<g>${op}
<line x1="${cx.toFixed(1)}" y1="${base - 4}" x2="${cx.toFixed(1)}" y2="${sy + sh}" stroke="${t.mute}" stroke-width="1" stroke-dasharray="${leadLen.toFixed(1)}"><animate attributeName="stroke-dashoffset" dur="${T}s" repeatCount="indefinite" keyTimes="0;${f(at)};${f(Math.min(at + 0.07, 0.9))};1" values="${leadLen.toFixed(1)};${leadLen.toFixed(1)};0;0"/></line>
<rect x="${sx.toFixed(1)}" y="${sy}" width="${sw}" height="${sh}" rx="2" fill="${t.panel}" stroke="${t.rule}"/>${lines}
<circle cx="${cx.toFixed(1)}" cy="${base}" r="3.6" fill="${t.accent}"/></g>`;
  }).join('\n');

  const head = `<g><animateTransform attributeName="transform" type="translate" dur="${T}s" repeatCount="indefinite" keyTimes="0;${scanEnd};1" values="0 0;${w.toFixed(1)} 0;${w.toFixed(1)} 0"/><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="0;0.03;${scanEnd};0.86;1" values="0;0.8;0.8;0;0"/><line x1="${x}" y1="${base - 9}" x2="${x}" y2="${base + 9}" stroke="${t.accent}" stroke-width="1"/></g>`;

  return `<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${t.rule}"/>
${commits}
${marks}
${head}
<text x="${x}" y="${y + 6}" class="m mute" font-size="10">decisions in the history</text>
<text x="${x}" y="${base + 18}" class="m mute" font-size="9">oldest</text>
<text x="${x + w}" y="${base + 18}" class="m mute" font-size="9" text-anchor="end">newest</text>`;
}
