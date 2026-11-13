// Motif: the 20 Hz carrier whose phase carries the data, three 200 ms symbols with a QPSK phase step at
// each boundary (dashed ticks), sampled by a 30 fps camera (dots and comb). The samples also lie on a
// 10 Hz curve (dashed), which is what the camera records. Below: a row of grid cells, each a 2x2 checker
// whose two halves have opposite signs and breathe at the cell's own phase.
export default function motif({ t, x, y, w, h, rng }) {
  const f = 20, fps = 30, sym = 0.2, nSym = 3, T = sym * nSym, t0 = 0.012;
  const phases = [Math.PI / 4, (5 * Math.PI) / 4, (3 * Math.PI) / 4]; // QPSK points
  const cy = y + 0.36 * h, amp = 0.15 * h;
  const X = (tt) => x + (tt / T) * w;
  const Y = (v) => cy - v * amp;
  const curve = (fn, perSym) => {
    let d = '', len = 0, px = 0, py = 0;
    for (let s = 0; s < nSym; s++) {
      for (let i = 0; i <= perSym; i++) {
        const tt = s * sym + (i / perSym) * sym, qx = X(tt), qy = Y(fn(tt, phases[s]));
        if (i) len += Math.hypot(qx - px, qy - py);
        d += `${i ? 'L' : 'M'}${qx.toFixed(1)} ${qy.toFixed(1)}`;
        px = qx; py = qy;
      }
    }
    return [d, Math.ceil(len)];
  };
  const carrier = (tt, p) => Math.cos(2 * Math.PI * f * tt + p);
  // The same camera samples lie on a 10 Hz curve: 20 Hz seen at 30 fps aliases to 10 Hz.
  const alias = (tt, p) => Math.cos(2 * Math.PI * (fps - f) * tt - p - 2 * Math.PI * fps * t0);
  const samples = [];
  for (let k = 0; t0 + k / fps < T; k++) {
    const tt = t0 + k / fps, s = Math.min(nSym - 1, Math.floor(tt / sym));
    samples.push([X(tt).toFixed(1), Y(carrier(tt, phases[s])).toFixed(1)]);
  }
  const top = y + 16, combY = y + h - 20;
  const cellTop = (y + 0.62 * h).toFixed(1), c = Math.min(14, 0.12 * h), gap = c * 0.8, q = (c / 2).toFixed(1);
  const nCells = Math.floor((w + gap) / (c + gap));
  const cx0 = x + (w - (nCells * c + (nCells - 1) * gap)) / 2;
  const r = rng(11);
  const groups = [[], [], [], []]; // by animation delay 0, 2, 4, 6 s of an 8 s cycle
  for (let i = 0; i < nCells; i++) {
    const px = (cx0 + i * (c + gap)).toFixed(1), k = Math.floor(r() * 4);
    groups[k].push(`<use href="#gcA" x="${px}" y="${cellTop}"/>`);
    groups[(k + 2) % 4].push(`<use href="#gcB" x="${px}" y="${cellTop}"/>`);
  }
  const [cd, cl] = curve(carrier, 40), [ad] = curve(alias, 14);
  let out = `<defs><path id="gcA" d="M0 0h${q}v${q}H0zM${q} ${q}h${q}v${q}h-${q}z" fill="${t.ink}" opacity=".75"/><path id="gcB" d="M${q} 0h${q}v${q}h-${q}zM0 ${q}h${q}v${q}H0z" fill="${t.ink}" opacity=".35"/></defs>`;
  out += `<path d="${[1, 2].map((s) => `M${X(s * sym).toFixed(1)} ${top}V${combY}`).join('')}" stroke="${t.rule}" stroke-dasharray="2 3"/>`;
  out += `<path d="${ad}" fill="none" stroke="${t.mute}" stroke-dasharray="2 3" style="animation:fade 12s ease-in-out infinite;animation-delay:3s;opacity:0"/>`;
  out += `<path d="${cd}" fill="none" stroke="${t.ink}" stroke-width="1.3" stroke-linejoin="round" stroke-dasharray="${cl} ${cl}"><animate attributeName="stroke-dashoffset" dur="12s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.55;0.7;0.72;1" keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1" values="0;0;-${cl};${cl};0"/></path>`;
  out += samples.map(([sx, sy]) => `<circle cx="${sx}" cy="${sy}" r="1.8" fill="${t.accent}"/>`).join('');
  out += groups.map((g, k) => `<g style="animation:pulse 8s ease-in-out infinite;animation-delay:-${k * 2}s">${g.join('')}</g>`).join('');
  out += `<path d="M${x} ${combY}H${x + w}" stroke="${t.rule}"/><path d="${samples.map(([sx]) => `M${sx} ${combY - 6}v6`).join('')}" stroke="${t.mute}"/>`;
  out += `<text x="${x}" y="${y + 9}" class="m mute" font-size="10">20 Hz carrier, phase is data</text>`;
  out += `<text x="${x}" y="${y + h - 4}" class="m mute" font-size="9">30 fps camera sees 10 Hz</text>`;
  return out;
}
