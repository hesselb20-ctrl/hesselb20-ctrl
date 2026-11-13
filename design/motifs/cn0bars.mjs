// Motif: one C/N0 bar per satellite plus the receiver gain (AGC). Jamming adds power, so every
// satellite drops by the same amount and the AGC turns down, then all recover. The dashed ticks are
// the per-signal baseline the detector keeps frozen while the signal looks suspicious.
export default function motif({ t, x, y, w, h, rng }) {
  const r = rng(11);
  const n = 9;                              // satellites
  const slots = n + 2;                      // one empty slot, then the AGC bar
  const slot = w / slots, bw = Math.max(6, slot * 0.46);
  const top = y + 18, base = y + h - 18;
  const H = base - top;
  const drop = 0.34 * H;                    // same dB loss on every satellite
  const dur = '12s';
  const kt = '0;0.28;0.4;0.68;0.8;1';
  const ks = '0 0 1 1;.45 0 .25 1;0 0 1 1;.45 0 .25 1;0 0 1 1';
  const anim = (attr, a, b) =>
    `<animate attributeName="${attr}" dur="${dur}" repeatCount="indefinite" calcMode="spline" keyTimes="${kt}" keySplines="${ks}" values="${a};${a};${b};${b};${a};${a}"/>`;
  const bar = (bx, lvl, d, fill) => {
    const hh = lvl * H, y1 = base - hh, y2 = y1 + d;
    return `<rect x="${bx.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" fill="${fill}">${anim('y', y1.toFixed(1), y2.toFixed(1))}${anim('height', hh.toFixed(1), (hh - d).toFixed(1))}</rect>
<line x1="${(bx - 2).toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(bx + bw + 2).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${t.mute}" stroke-dasharray="2 2"/>`;
  };
  let out = `<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${t.rule}"/>`;
  for (let i = 0; i < n; i++) {
    const lvl = 0.5 + 0.42 * r();
    out += bar(x + i * slot + (slot - bw) / 2, lvl, drop, t.ink);
  }
  const ax = x + (slots - 1) * slot + (slot - bw) / 2;
  out += bar(ax, 0.82, 0.3 * H, t.mute);
  const sep = x + (n + 0.5) * slot;
  out += `<line x1="${sep.toFixed(1)}" y1="${top + 4}" x2="${sep.toFixed(1)}" y2="${base}" stroke="${t.rule}" stroke-dasharray="1 3"/>`;
  out += `<text x="${x + w}" y="${y + 6}" class="m acc" font-size="10" text-anchor="end" opacity="0"><animate attributeName="opacity" dur="${dur}" repeatCount="indefinite" keyTimes="${kt}" values="0;0;1;1;0;0"/>jam event</text>`;
  out += `<text x="${x}" y="${y + 6}" class="m mute" font-size="10">C/N0 per satellite</text>`;
  out += `<text x="${x}" y="${base + 14}" class="m mute" font-size="9">dashes: learned baseline</text>`;
  out += `<text x="${(ax + bw + 2).toFixed(1)}" y="${base + 14}" class="m mute" font-size="9" text-anchor="end">AGC</text>`;
  return out;
}
