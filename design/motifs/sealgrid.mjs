// Motif: a 16:9 video frame carrying the 32 x 18 cell grid of the hidden channel. A few cells shift tone
// slowly (the statement riding in the pixels). A ring in the corner closes in two halves, because the
// verifier needs two valid statements in a row before it shows green.
export default function motif({ t, x, y, w, h, rng }) {
  const top = y + 14;
  let fh = h - 16, fw = (fh * 16) / 9;
  if (fw > w) { fw = w; fh = (fw * 9) / 16; }
  const cols = 32, rows = 18, cw = fw / cols, ch = fh / rows;
  const f = (v) => v.toFixed(1);
  let grid = '';
  for (let i = 1; i < cols; i++) grid += `M${f(x + i * cw)} ${f(top)}v${f(fh)}`;
  for (let j = 1; j < rows; j++) grid += `M${f(x)} ${f(top + j * ch)}h${f(fw)}`;
  const r = rng(11);
  let cells = '';
  for (let k = 0; k < 14; k++) {
    const c = Math.floor(r() * cols), rw = Math.floor(r() * rows);
    const dur = (8 + r() * 6).toFixed(1), begin = (-r() * 12).toFixed(1);
    const peak = (0.18 + r() * 0.2).toFixed(2);
    cells += `<rect x="${f(x + c * cw + 0.5)}" y="${f(top + rw * ch + 0.5)}" width="${f(cw - 1)}" height="${f(ch - 1)}" fill="${t.ink}" opacity="0"><animate attributeName="opacity" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="0;${peak};0"/></rect>`;
  }
  const rad = Math.max(6, Math.min(9, fh / 12));
  const cx = x + fw - rad - 7, cy = top + fh - rad - 7;
  const C = 2 * Math.PI * rad;
  const ring = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="${t.bg}" stroke="${t.rule}" stroke-width="1.2"/>
<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="none" stroke="${t.accent}" stroke-width="1.6" stroke-dasharray="${f(C)}" stroke-dashoffset="${f(C)}" transform="rotate(-90 ${f(cx)} ${f(cy)})"><animate attributeName="stroke-dashoffset" dur="12s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.15;0.3;0.42;0.57;0.88;1" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1" values="${f(C)};${f(C)};${f(C / 2)};${f(C / 2)};0;0;${f(C)}"/></circle>
<path d="M${f(cx - rad * 0.42)} ${f(cy + rad * 0.02)}l${f(rad * 0.3)} ${f(rad * 0.32)}l${f(rad * 0.55)} ${f(-rad * 0.62)}" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-linecap="round" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0;0.57;0.63;0.86;0.92;1" values="0;0;1;1;0;0"/></path>`;
  const side = w - fw > 90;
  const okLabel = side
    ? `<text x="${f(x + fw + 12)}" y="${f(cy + 3.5)}" class="m acc" font-size="9" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0;0.57;0.63;0.86;0.92;1" values="0;0;1;1;0;0"/>verified</text>`
    : `<text x="${f(x + fw)}" y="${y + 6}" class="m acc" font-size="9" text-anchor="end" opacity="0"><animate attributeName="opacity" dur="12s" repeatCount="indefinite" keyTimes="0;0.57;0.63;0.86;0.92;1" values="0;0;1;1;0;0"/>verified</text>`;
  return `<rect x="${f(x)}" y="${f(top)}" width="${f(fw)}" height="${f(fh)}" rx="2" fill="none" stroke="${t.mute}" stroke-width="1"/>
<path d="${grid}" fill="none" stroke="${t.rule}" stroke-width="0.5" opacity="0.7"/>
${cells}
${ring}
<text x="${x}" y="${y + 6}" class="m mute" font-size="10">hidden channel</text>
${okLabel}`;
}
