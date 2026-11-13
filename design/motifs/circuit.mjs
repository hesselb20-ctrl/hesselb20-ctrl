// Motif: stacked model layers with components as nodes. One path of nodes across the layers lights up
// step by step (a recovered circuit, one experiment at a time), then a tick appears when it verifies.
export default function motif({ t, x, y, w, h, rng }) {
  const r = rng(11);
  const L = h >= 130 ? 5 : 4;                      // layers, bottom = first layer, top = last
  const K = Math.max(7, Math.min(12, Math.floor(w / 26)));
  const top = y + 26, bot = y + h - 8;
  const gy = (bot - top) / (L - 1);
  const x0 = x + 6, gx = (w - 12) / (K - 1);
  const ly = (i) => bot - i * gy;                  // layer i, counted from the bottom
  const nx = (j) => x0 + j * gx;
  const dur = 14, f = (v) => v.toFixed(1);

  // the recovered path: one node per layer, drifting sideways a little
  const frac = [0.2, 0.55, 0.35, 0.75, 0.6];
  const path = frac.slice(0, L).map((u) => Math.round(u * (K - 1) + (r() - 0.5)));
  const at = (i) => 0.06 + i * 0.11;               // when node i lights (fraction of the loop)
  const end = at(L - 1) + 0.1;                     // tick

  let out = '';
  for (let i = 0; i < L; i++) {
    out += `<line x1="${x}" y1="${f(ly(i))}" x2="${x + w}" y2="${f(ly(i))}" stroke="${t.rule}"/>`;
    for (let k = 0; k < K; k++) out += `<circle cx="${f(nx(k))}" cy="${f(ly(i))}" r="2.4" fill="${t.bg}" stroke="${t.mute}" stroke-opacity=".7"/>`;
  }

  // lit path, in one group that fades out together at the end of the loop
  let lit = '';
  for (let i = 0; i < L; i++) {
    const cx = f(nx(path[i])), cy = f(ly(i)), a = at(i);
    if (i < L - 1) {
      const x2 = nx(path[i + 1]), y2 = ly(i + 1);
      const len = Math.hypot(x2 - nx(path[i]), y2 - ly(i)).toFixed(1);
      const b = a + 0.02, c = at(i + 1);
      lit += `<line x1="${cx}" y1="${cy}" x2="${f(x2)}" y2="${f(y2)}" stroke="${t.accent}" stroke-width="1.4" stroke-dasharray="${len}" stroke-dashoffset="${len}"><animate attributeName="stroke-dashoffset" dur="${dur}s" repeatCount="indefinite" values="${len};${len};0;0" keyTimes="0;${b.toFixed(3)};${c.toFixed(3)};1"/></line>`;
    }
    lit += `<circle cx="${cx}" cy="${cy}" r="3.6" fill="${t.accent}" opacity="0"><animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="0;0;1;1" keyTimes="0;${a.toFixed(3)};${(a + 0.03).toFixed(3)};1"/></circle>`;
  }
  // the tick and its label, top right
  const tx = x + w - 74, tyy = y + 2;
  lit += `<g opacity="0"><animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="0;0;1;1" keyTimes="0;${end.toFixed(3)};${(end + 0.04).toFixed(3)};1"/><path d="M${tx} ${tyy + 1}l3.5 3.5l7 -8" fill="none" stroke="${t.accent}" stroke-width="1.6"/><text x="${x + w}" y="${y + 6}" class="m acc" font-size="10" text-anchor="end">verified</text></g>`;
  out += `<g><animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;0.88;0.95;1"/>${lit}</g>`;
  out += `<text x="${x}" y="${y + 6}" class="m mute" font-size="10">recovered circuit</text>`;
  return out;
}
