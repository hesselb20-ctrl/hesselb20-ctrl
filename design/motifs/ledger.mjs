// Motif: an evidence ledger. Each row is a claim; its bar draws as the tool runs and the square
// at the end fills once a record backs it. One row stays open: an unknown is recorded, not guessed.
export default function motif({ t, x, y, w, h, rng }) {
  const r = rng(11);
  const top = y + 24, gap = 19;
  const n = Math.max(3, Math.floor((h - 30) / gap) + 1);
  const open = n - 2; // the row that is never verified
  const sq = 7, sx = x + w - sq, lineEnd = sx - 10;
  const dur = 14, step = 0.1, draw = 0.07;
  const k = (v) => Math.min(0.999, Math.max(0.001, v)).toFixed(3);
  let out = `<text x="${x}" y="${y + 6}" class="m mute" font-size="10">evidence ledger</text>`;
  for (let i = 0; i < n; i++) {
    const ry = top + i * gap;
    const len = (0.38 + 0.5 * r()) * (lineEnd - x - 12);
    const bx = x + 12;
    const s0 = 0.04 + i * step, s1 = s0 + draw, s2 = s1 + 0.03;
    out += `<line x1="${bx}" y1="${ry}" x2="${lineEnd}" y2="${ry}" stroke="${t.rule}"/>`;
    out += `<rect x="${x}" y="${ry - 2}" width="4" height="4" fill="${t.mute}"/>`;
    if (i === open) {
      // drawn halfway, then left open: dashed tail, empty square, label
      const half = len * 0.55;
      out += `<line x1="${bx}" y1="${ry}" x2="${(bx + half).toFixed(1)}" y2="${ry}" stroke="${t.ink}" stroke-width="2" stroke-dasharray="${half.toFixed(1)}" stroke-dashoffset="${half.toFixed(1)}"><animate attributeName="stroke-dashoffset" dur="${dur}s" repeatCount="indefinite" keyTimes="0;${k(s0)};${k(s1 + 0.04)};0.9;1" values="${half.toFixed(1)};${half.toFixed(1)};0;0;${half.toFixed(1)}"/></line>`;
      out += `<line x1="${(bx + half + 4).toFixed(1)}" y1="${ry}" x2="${(bx + len).toFixed(1)}" y2="${ry}" stroke="${t.mute}" stroke-dasharray="2 4"/>`;
      out += `<rect class="pulse" x="${sx + 0.5}" y="${ry - sq / 2 + 0.5}" width="${sq - 1}" height="${sq - 1}" fill="none" stroke="${t.accent}"/>`;
      out += `<text x="${sx - 10}" y="${ry - 6}" class="m mute" font-size="9" text-anchor="end">unknown</text>`;
      continue;
    }
    out += `<line x1="${bx}" y1="${ry}" x2="${(bx + len).toFixed(1)}" y2="${ry}" stroke="${t.ink}" stroke-width="2" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${len.toFixed(1)}"><animate attributeName="stroke-dashoffset" dur="${dur}s" repeatCount="indefinite" keyTimes="0;${k(s0)};${k(s1)};0.9;1" values="${len.toFixed(1)};${len.toFixed(1)};0;0;${len.toFixed(1)}"/></line>`;
    out += `<rect x="${sx + 0.5}" y="${ry - sq / 2 + 0.5}" width="${sq - 1}" height="${sq - 1}" fill="none" stroke="${t.mute}"/>`;
    out += `<rect x="${sx}" y="${ry - sq / 2}" width="${sq}" height="${sq}" fill="${t.accent}" opacity="0"><animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" keyTimes="0;${k(s1)};${k(s2)};0.9;0.95;1" values="0;0;1;1;0;0"/></rect>`;
  }
  return out;
}
