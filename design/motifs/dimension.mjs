// Motif: the plan view of a bracket is traced, then the one known dimension (hole spacing)
// is drawn in with extension lines and ticks. Everything else is scaled from that one number.
// Geometry is the example bracket: 80 x 50 plate, flange on the far edge, two 6.5 mm holes 40 mm apart.
export default function motif({ t, x, y, w, h }) {
  const T = 12; // loop length in seconds; t = 0 is the fully drawn state, so a still frame shows the drawing
  const s = Math.min((w * 0.86) / 80, (h - 40) / 50); // px per mm
  const pw = 80 * s, ph = 50 * s;
  const cx = x + w / 2, top = y + 15, bot = top + ph, cy = top + ph / 2;
  const r = 6 * s, ft = 5 * s; // corner fillet on the free corners, flange thickness
  const f = (v) => v.toFixed(1);
  const L = cx - pw / 2, R = cx + pw / 2;
  const hx = 20 * s, hy = cy + 8 * s, hr = 3.25 * s; // holes at x = ±20, y = -8 (image down is -y)
  const dimY = bot + 10, tk = 3.5;
  const k = (a) => (a / T).toFixed(3);
  // stroke draws in between a and b (seconds); before 4.6 s it is fully drawn, then reset while hidden
  // dash lengths are explicit (no pathLength) so static rasterisers draw solid lines
  const dash = (len) => `stroke-dasharray="${f(len + 1)}"`;
  const draw = (a, b, len) => `<animate attributeName="stroke-dashoffset" dur="${T}s" repeatCount="indefinite" keyTimes="0;${k(4.6)};${k(4.65)};${k(a)};${k(b)};1" values="0;0;${f(len + 1)};${f(len + 1)};0;0"/>`;
  const appear = (a, b) => `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="0;${k(4.6)};${k(4.65)};${k(a)};${k(b)};1" values="1;1;0;0;1;1"/>`;
  const ln = (x1, y1, x2, y2, st, sw, a, b) => { const n = Math.hypot(x2 - x1, y2 - y1); return `<path ${dash(n)} d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${st}" stroke-width="${sw}" fill="none">${draw(a, b, n)}</path>`; };
  const outline = `M${f(L)} ${f(top)}H${f(R)}V${f(bot - r)}A${f(r)} ${f(r)} 0 0 1 ${f(R - r)} ${f(bot)}H${f(L + r)}A${f(r)} ${f(r)} 0 0 1 ${f(L)} ${f(bot - r)}Z`;
  const sl = 7 * s, sw2 = 2.5 * s, sy = cy - 8 * s; // slot 14 x 5 at y = +8
  const slot = `M${f(cx - sl + sw2)} ${f(sy - sw2)}H${f(cx + sl - sw2)}A${f(sw2)} ${f(sw2)} 0 0 1 ${f(cx + sl - sw2)} ${f(sy + sw2)}H${f(cx - sl + sw2)}A${f(sw2)} ${f(sw2)} 0 0 1 ${f(cx - sl + sw2)} ${f(sy - sw2)}Z`;
  const hole = (px) => `<circle ${dash(2 * Math.PI * hr)} cx="${f(px)}" cy="${f(hy)}" r="${f(hr)}" fill="none" stroke="${t.ink}" stroke-width="1.2">${draw(6.2, 7.2, 2 * Math.PI * hr)}</circle>`
    + `<path d="M${f(px - hr - 3)} ${f(hy)}h${f(2 * hr + 6)}M${f(px)} ${f(hy - hr - 3)}v${f(2 * hr + 6)}" stroke="${t.mute}" stroke-width=".7">${appear(6.8, 7.4)}</path>`;
  const tick = (px) => `<path d="M${f(px - tk)} ${f(dimY + tk)}L${f(px + tk)} ${f(dimY - tk)}" stroke="${t.accent}" stroke-width="1.3">${appear(9.6, 10.1)}</path>`;
  const a1 = cx - hx, a2 = cx + hx;
  const oLen = 2 * pw + 2 * ph - 4 * r + Math.PI * r; // two rounded corners
  const sLen = 2 * (2 * sl - 2 * sw2) + 2 * Math.PI * sw2;
  return `<g><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="0;${k(3.6)};${k(4.5)};${k(4.8)};${k(4.85)};1" values="1;1;0;0;1;1"/>
<path ${dash(oLen)} d="${outline}" fill="none" stroke="${t.ink}" stroke-width="1.4" stroke-linejoin="round">${draw(5, 7, oLen)}</path>
${ln(L, top + ft, R, top + ft, t.mute, 1, 6, 7.2)}
<path ${dash(sLen)} d="${slot}" fill="none" stroke="${t.mute}" stroke-width="1">${draw(6.4, 7.4, sLen)}</path>
${hole(a1)}${hole(a2)}
${ln(a1, hy + hr + 3, a1, dimY + 5, t.mute, .8, 7.6, 8.4)}${ln(a2, hy + hr + 3, a2, dimY + 5, t.mute, .8, 7.6, 8.4)}
${ln(a1, dimY, a2, dimY, t.accent, 1, 8.5, 9.6)}
${tick(a1)}${tick(a2)}
<text x="${f(cx)}" y="${f(dimY + 14)}" class="m acc" font-size="10" text-anchor="middle">40 mm known${appear(9.8, 10.6)}</text>
</g>
<text x="${x}" y="${y + 6}" class="m mute" font-size="10">plan view</text>
<text x="${x + w}" y="${y + 6}" class="m mute" font-size="9" text-anchor="end">1 reference → all sizes</text>`;
}
