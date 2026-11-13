// Motif: a network waterfall. Many recorded requests, at staggered offsets, converge into a few
// templated endpoints (tracekit clusters /todos/17 and /todos/42 into /todos/{id}).
export default function motif({ t, x, y, w, h, rng }) {
  const r = rng(11);
  const n = 10, m = 4;
  const map = [0, 1, 2, 2, 3, 1, 2, 3, 2, 1]; // which endpoint each request collapses into
  const top = y + 18, bottom = y + h - 4, span = bottom - top;
  const leftW = w * 0.56, xr = x + w * 0.72;
  const f = (v) => v.toFixed(1);
  const ey = (j) => top + (j + 0.5) * (span / m);
  const counts = Array(m).fill(0);
  map.forEach((j) => counts[j]++);

  let base = '', lit = '';
  for (let i = 0; i < n; i++) {
    const by = top + (i + 0.5) * (span / n);
    const bx = x + leftW * (0.02 + 0.62 * (i / (n - 1))) + r() * 6;
    const bl = leftW * (0.1 + 0.22 * r());
    const be = Math.min(bx + bl, x + leftW);
    const ty = ey(map[i]), cx = (be + xr) / 2;
    const d = `M${f(be)} ${f(by)}C${f(cx)} ${f(by)} ${f(cx)} ${f(ty)} ${f(xr - 5)} ${f(ty)}`;
    const bar = (fill) => `<rect x="${f(bx)}" y="${f(by - 1.5)}" width="${f(be - bx)}" height="3" fill="${fill}"/>`;
    base += `${bar(t.mute)}<path d="${d}" fill="none" stroke="${t.rule}"/>`;
    lit += `<g style="animation:fade 14s ease-in-out infinite;animation-delay:${(i * 0.9).toFixed(1)}s;opacity:0">${bar(t.accent)}<path d="${d}" fill="none" stroke="${t.accent}" stroke-width="1.2"/></g>`;
  }
  let ends = '';
  for (let j = 0; j < m; j++) {
    const yy = ey(j), lx = xr + 9, lw = (x + w - lx) * (counts[j] / Math.max(...counts));
    ends += `<line x1="${f(lx)}" y1="${f(yy)}" x2="${x + w}" y2="${f(yy)}" stroke="${t.rule}"/><rect x="${f(lx)}" y="${f(yy - 2)}" width="${f(lw)}" height="4" fill="${t.ink}"/><circle class="pulse" style="animation-delay:${(j * 1.5).toFixed(1)}s" cx="${f(xr)}" cy="${f(yy)}" r="3" fill="${t.accent}"/>`;
  }
  return `<line x1="${f(x + leftW)}" y1="${top - 4}" x2="${f(x + leftW)}" y2="${bottom}" stroke="${t.faint}"/>
${base}
${lit}
${ends}
<text x="${x}" y="${y + 6}" class="m mute" font-size="10">recorded calls</text>
<text x="${x + w}" y="${y + 6}" class="m mute" font-size="10" text-anchor="end">endpoints</text>`;
}
