// Motif: a spectrum where a narrow peak emerges from noise as sessions are stacked.
export default function motif({ t, x, y, w, h, rng }) {
    const n = 72, r = rng(7);
    const noise = Array.from({ length: n }, () => r() - 0.5);
    const base = y + h - 18;
    const peakAt = 0.62, width = 0.018;
    const pts = (noiseAmp) => Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const lor = 1 / (1 + ((u - peakAt) / width) ** 2);
      const slope = 0.16 * (1 - u); // phone noise rises at low frequency
      const v = slope + 0.5 * lor + noiseAmp * (noise[i] + 0.5) * (0.3 + 0.3 * (1 - u));
      return `${(x + u * w).toFixed(1)} ${(base - Math.max(0, v) * (h - 46)).toFixed(1)}`;
    });
    const d = (a) => 'M' + pts(a).join('L');
    const px = x + peakAt * w;
    return `<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${t.rule}"/>
${[0.25, 0.5, 0.75].map((u) => `<line x1="${x + u * w}" y1="${base}" x2="${x + u * w}" y2="${base + 5}" stroke="${t.rule}"/>`).join('')}
<path fill="none" stroke="${t.ink}" stroke-width="1.4" stroke-linejoin="round" d="${d(0.9)}"><animate attributeName="d" dur="14s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.45;0.75;1" keySplines=".4 0 .2 1;0 0 1 1;.4 0 .2 1" values="${d(0.9)};${d(0.05)};${d(0.05)};${d(0.9)}"/></path>
<g style="animation:fade 14s linear infinite;animation-delay:2.2s;opacity:0"><line x1="${px}" y1="${y + 14}" x2="${px}" y2="${base}" stroke="${t.accent}" stroke-dasharray="2 4"/><circle cx="${px}" cy="${(base - 0.5 * (h - 46)).toFixed(1)}" r="3.5" fill="${t.accent}"/><text x="${px + 9}" y="${y + 20}" class="m acc" font-size="10">first mode</text></g>
<text x="${x}" y="${y + 6}" class="m mute" font-size="10">stacked spectrum</text>
<text x="${x}" y="${base + 20}" class="m mute" font-size="9">frequency</text>
<text x="${x + w}" y="${base + 20}" class="m mute" font-size="9" text-anchor="end">noise floor → peak</text>`;
}
