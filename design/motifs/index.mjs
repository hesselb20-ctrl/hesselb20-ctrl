// Motif: the portfolio as a field of nodes, one per project, joined to a common baseline.
export default function motif({ t, x, y, w, h }) {
  const n = 12, cols = 6, rows = 2;
  const gx = w / cols, top = y + 26, gy = (h - 60) / (rows - 1 || 1);
  let out = `<text x="${x}" y="${y + 6}" class="m mute" font-size="10">twelve repositories</text>`;
  const base = y + h - 12;
  out += `<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${t.rule}"/>`;
  for (let i = 0; i < n; i++) {
    const cx = x + gx * (i % cols) + gx / 2, cy = top + gy * Math.floor(i / cols);
    out += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${base}" stroke="${t.rule}" stroke-dasharray="1 5"/>`;
    out += `<rect x="${(cx - 9).toFixed(1)}" y="${(cy - 9).toFixed(1)}" width="18" height="18" fill="none" stroke="${t.mute}"/>`;
    out += `<rect class="pulse" style="animation-duration:9s;animation-delay:${(i * 0.75).toFixed(2)}s" x="${(cx - 4).toFixed(1)}" y="${(cy - 4).toFixed(1)}" width="8" height="8" fill="${t.accent}"/>`;
  }
  out += `<rect x="${x}" y="${base - 1}" width="36" height="2" fill="${t.accent}" style="--d:${w - 36}px;animation:sweep 18s ease-in-out infinite alternate"/>`;
  return out;
}
