// Motif: the edit of the bundled test clip as shotlist measures it.
// Nine shots of unequal length (cut frames from samples/test-clip.shotlist.json, 450 frames at 30 fps),
// a beat row every 15 frames (120 BPM), a playhead crossing in the clip's own 15 seconds.
// Cuts within 2 frames of a beat get a filled marker; the two off-beat cuts get a hollow one.
export default function motif({ t, x, y, w, h }) {
  const total = 450, beat = 15, tol = 2, dur = 15;
  const cuts = [45, 90, 114, 150, 189, 240, 300, 360];
  const X = (f) => +(x + (f / total) * w).toFixed(1);
  const sTop = y + 20, sH = h - 20 - 52, sBot = sTop + sH;
  const bTop = sBot + 18, bBot = bTop + 8;
  const bounds = [0, ...cuts, total];
  let out = '';
  // shots
  for (let i = 0; i < bounds.length - 1; i++) {
    out += `<rect x="${X(bounds[i])}" y="${sTop}" width="${(X(bounds[i + 1]) - X(bounds[i])).toFixed(1)}" height="${sH}" fill="${i % 2 ? t.faint : t.panel}"/>`;
  }
  out += `<rect x="${x}" y="${sTop}" width="${w}" height="${sH}" fill="none" stroke="${t.rule}"/>`;
  // beat row
  out += `<line x1="${x}" y1="${bBot}" x2="${x + w}" y2="${bBot}" stroke="${t.rule}"/>`;
  for (let f = 0; f <= total; f += beat) {
    out += `<line x1="${X(f)}" y1="${bTop + (f % 60 ? 3 : 0)}" x2="${X(f)}" y2="${bBot}" stroke="${t.mute}"/>`;
  }
  // cuts
  for (const c of cuts) {
    const on = Math.abs(Math.round(c / beat) * beat - c) <= tol;
    const cx = X(c), begin = (c / 30).toFixed(2);
    out += `<line x1="${cx}" y1="${sTop - 4}" x2="${cx}" y2="${sBot + 4}" stroke="${t.ink}" stroke-width="1.2"/>`;
    out += on
      ? `<line x1="${cx}" y1="${sBot + 4}" x2="${cx}" y2="${bTop - 3}" stroke="${t.accent}" stroke-dasharray="2 2"/><circle cx="${cx}" cy="${bTop - 3}" r="2.6" fill="${t.accent}"><animate attributeName="r" values="2.6;4.2;2.6;2.6" keyTimes="0;0.04;0.12;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`
      : `<circle cx="${cx}" cy="${bTop - 3}" r="2.6" fill="${t.bg}" stroke="${t.mute}"/>`;
  }
  // playhead, one pass per 15 s, fading at both ends so the return is never seen
  out += `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.03;0.97;1" dur="${dur}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" from="0 0" to="${w} 0" dur="${dur}s" repeatCount="indefinite"/><line x1="${x}" y1="${sTop - 6}" x2="${x}" y2="${bBot + 2}" stroke="${t.accent}" stroke-width="1.2"/><path d="M${x - 4} ${sTop - 10}h8l-4 5z" fill="${t.accent}"/></g>`;
  // labels
  out += `<text x="${x}" y="${y + 6}" class="m mute" font-size="10">test clip · 9 shots</text>`;
  out += `<text x="${x}" y="${y + h - 4}" class="m mute" font-size="9">beats · 120 bpm</text>`;
  out += `<g><circle cx="${x + w - 84}" cy="${y + h - 7}" r="2.6" fill="${t.accent}"/><text x="${x + w}" y="${y + h - 4}" class="m mute" font-size="9" text-anchor="end">cut on beat</text></g>`;
  return out;
}
