// Portfolio design system: one generator, every repo.
// Usage: node build.mjs <project.json> <outDir>
// Emits animated SVGs (SMIL + embedded CSS keyframes, no scripts, no external fonts):
//   hero-{dark,light}.svg, hero-mobile-{dark,light}.svg,
//   rule-NN-{dark,light}.svg (section dividers), flow-{dark,light}.svg (architecture),
//   social.svg (1280x640, static, rasterised separately).
import fs from 'node:fs';
import path from 'node:path';

const [, , cfgPath, outDir] = process.argv;
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const SANS = "'Inter','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono','Cascadia Mono','Segoe UI Mono',Menlo,Consolas,'Liberation Mono',monospace";

// Monochrome by rule: black, white and greys. Colour is reserved for separating series in a graph.
const THEMES = {
  dark: { bg: '#0A0A0A', panel: '#111111', rule: '#2B2B2B', faint: '#171717', ink: '#EDEDED', mute: '#8C8C8C', accent: '#FFFFFF' },
  light: { bg: '#F5F5F5', panel: '#EBEBEB', rule: '#C8C8C8', faint: '#E8E8E8', ink: '#111111', mute: '#5F5F5F', accent: '#000000' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// deterministic noise so every build is byte-identical
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const style = (t, extra = '') => `<style>
.s{font-family:${SANS}}.m{font-family:${MONO};letter-spacing:.14em;text-transform:uppercase}
.ink{fill:${t.ink}}.mute{fill:${t.mute}}.acc{fill:${t.accent}}
@keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes dash{to{stroke-dashoffset:-48}}
@keyframes fade{0%,100%{opacity:0}35%,65%{opacity:1}}
@keyframes sweep{0%{transform:translateX(0)}100%{transform:translateX(var(--d))}}
.pulse{animation:pulse 4s ease-in-out infinite}
.flow{stroke-dasharray:3 9;animation:dash 6s linear infinite}
${extra}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;

const frame = (t, w, h) => {
  const c = 10, m = 14; // corner ticks
  const tick = (x, y, dx, dy) => `<path d="M${x + dx * c} ${y}H${x}V${y + dy * c}" fill="none" stroke="${t.mute}" stroke-width="1"/>`;
  return `<rect width="${w}" height="${h}" rx="3" fill="${t.bg}"/>
<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${t.faint}" stroke-width="1"/></pattern></defs>
<rect width="${w}" height="${h}" rx="3" fill="url(#g)"/>
${tick(m, m, 1, 1)}${tick(w - m, m, -1, 1)}${tick(m, h - m, 1, -1)}${tick(w - m, h - m, -1, -1)}`;
};

// ---------------------------------------------------------------- motif
// One file per project in motifs/<name>.mjs. It draws into a box and returns an SVG string.
const { default: motifFn } = await import(new URL(`./motifs/${cfg.motif}.mjs`, import.meta.url));
const motif = (t, x, y, w, h) => motifFn({ t, x, y, w, h, rng, esc });

// ---------------------------------------------------------------- hero
function hero(theme, mobile) {
  const t = THEMES[theme];
  const [w, h] = mobile ? [420, 430] : [800, 330];
  const pad = mobile ? 30 : 44;
  const title = mobile ? 44 : 56;
  const facts = cfg.facts.map(([k, v], i) => {
    const fx = mobile ? pad : pad + i * 236;
    const fy = mobile ? 368 + i * 17 : 286;
    return mobile
      ? `<text x="${fx}" y="${fy}" class="m" font-size="9.5"><tspan class="mute">${esc(k)}</tspan><tspan class="ink" dx="10">${esc(v)}</tspan></text>`
      : `<text x="${fx}" y="${fy}" class="m mute" font-size="9">${esc(k)}</text><text x="${fx}" y="${fy + 16}" class="m ink" font-size="10">${esc(v)}</text>`;
  }).join('');
  const mission = mobile ? cfg.missionLines : [cfg.mission];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(cfg.name)}: ${esc(cfg.mission)}">
${style(t)}
${frame(t, w, h)}
<text x="${pad}" y="${mobile ? 52 : 58}" class="m mute" font-size="${mobile ? 9.5 : 10}">${esc(cfg.domain)}</text>
${mobile
  ? `<g transform="translate(${pad} 68)"><circle class="pulse" r="3" cx="3" cy="0" fill="${t.accent}"/><text x="14" y="4" class="m acc" font-size="9.5">${esc(cfg.status)}</text></g>`
  : `<g transform="translate(${w - pad} 54)"><circle class="pulse" r="3" cx="-3" cy="0" fill="${t.accent}"/><text x="-14" y="4" class="m acc" font-size="10" text-anchor="end">${esc(cfg.status)}</text></g>`}
<text x="${pad - 2}" y="${mobile ? 134 : 136}" class="s ink" font-size="${title}" font-weight="600" letter-spacing="-1.5">${esc(cfg.name)}</text>
${mission.map((l, i) => `<text x="${pad}" y="${(mobile ? 164 : 170) + i * 21}" class="s mute" font-size="${mobile ? 15 : 16.5}">${esc(l)}</text>`).join('')}
<line x1="${pad}" y1="${mobile ? 344 : 258}" x2="${w - pad}" y2="${mobile ? 344 : 258}" stroke="${t.rule}"/>
<rect x="${pad}" y="${(mobile ? 344 : 258) - 1}" width="56" height="2" fill="${t.accent}" style="--d:${w - 2 * pad - 56}px;animation:sweep 16s ease-in-out infinite alternate"/>
${facts}
${mobile ? motif(t, pad, 222, w - 2 * pad, 110) : motif(t, 478, 84, 278, 150)}
</svg>`;
}

// ---------------------------------------------------------------- section rule
function rule(theme, idx, label, mobile) {
  const t = THEMES[theme];
  const w = mobile ? 420 : 800, h = 40;
  const lx = 44 + label.length * 9.2 + 22; // mono 12px with .14em tracking
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
${style(t)}
<text x="0" y="25" class="m acc" font-size="12">${String(idx).padStart(2, '0')}</text>
<text x="34" y="25" class="m ink" font-size="12" font-weight="600">${esc(label)}</text>
<line x1="${lx}" y1="21" x2="${w}" y2="21" stroke="${t.rule}"/>
<rect x="${lx}" y="20" width="40" height="2" fill="${t.accent}" style="--d:${w - lx - 40}px;animation:sweep 12s ease-in-out infinite alternate"/>
<path d="M${w - 6} 15v12" stroke="${t.mute}"/>
</svg>`;
}

// ---------------------------------------------------------------- architecture flow
function flow(theme) {
  const t = THEMES[theme];
  const w = 800, bw = 216, bh = 78, gap = 40, x0 = 36, rowGap = 140, y0 = 72;
  const rows = cfg.flow;
  const h = y0 + (rows.length - 1) * rowGap + bh + 34;
  let out = '', k = 0;
  rows.forEach((row, ri) => {
    const y = y0 + ri * rowGap;
    out += `<text x="${x0}" y="${y - 18}" class="m" font-size="10.5"><tspan class="acc">${String.fromCharCode(65 + ri)}</tspan><tspan class="mute" dx="10">${esc(row.lane)}</tspan></text><line x1="${x0 + 30 + row.lane.length * 8.2}" y1="${y - 22}" x2="${w - x0}" y2="${y - 22}" stroke="${t.faint}"/>`;
    row.nodes.forEach((nd, ci) => {
      const x = x0 + ci * (bw + gap);
      out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="2" fill="${t.panel}" stroke="${t.rule}"/>
<circle class="pulse" style="animation-delay:${(k * 0.45).toFixed(2)}s" cx="${x + 16}" cy="${y + 21}" r="3" fill="${t.accent}"/>
<text x="${x + 28}" y="${y + 25}" class="m ink" font-size="11" font-weight="600">${esc(nd[0])}</text>
<text x="${x + 16}" y="${y + 47}" class="s mute" font-size="12">${esc(nd[1])}</text>
<text x="${x + 16}" y="${y + 63}" class="s mute" font-size="12">${esc(nd[2] || '')}</text>`;
      if (ci < row.nodes.length - 1) {
        const ax = x + bw, ay = y + bh / 2;
        out += `<path class="flow" d="M${ax} ${ay}H${ax + gap - 5}" fill="none" stroke="${t.accent}" stroke-width="1.5"/><path d="M${ax + gap - 6} ${ay - 4}l5 4l-5 4" fill="none" stroke="${t.accent}" stroke-width="1.2"/>`;
      }
      k++;
    });
    if (ri < rows.length - 1) {
      const lastX = x0 + (row.nodes.length - 1) * (bw + gap) + bw / 2;
      const firstX = x0 + bw - 26, midY = y + bh + 22, ny = y + rowGap;
      out += `<path class="flow" d="M${lastX} ${y + bh}V${midY}H${firstX}V${ny - 5}" fill="none" stroke="${t.accent}" stroke-width="1.5"/><path d="M${firstX - 4} ${ny - 6}l4 5l4 -5" fill="none" stroke="${t.accent}" stroke-width="1.2"/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(cfg.flowAlt)}">
${style(t)}
${frame(t, w, h)}
${out}
</svg>`;
}

// Phone-width variant: one column, read top to bottom.
function flowMobile(theme) {
  const t = THEMES[theme];
  const w = 420, x = 30, bw = 360, bh = 72, gap = 24;
  let y = 30, out = '', k = 0;
  cfg.flow.forEach((row, ri) => {
    y += 26;
    out += `<text x="${x}" y="${y}" class="m" font-size="11"><tspan class="acc">${String.fromCharCode(65 + ri)}</tspan><tspan class="mute" dx="10">${esc(row.lane)}</tspan></text>`;
    y += 16;
    row.nodes.forEach((nd, ci) => {
      out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="2" fill="${t.panel}" stroke="${t.rule}"/>
<circle class="pulse" style="animation-delay:${(k * 0.45).toFixed(2)}s" cx="${x + 18}" cy="${y + 22}" r="3.2" fill="${t.accent}"/>
<text x="${x + 32}" y="${y + 26}" class="m ink" font-size="12" font-weight="600">${esc(nd[0])}</text>
<text x="${x + 18}" y="${y + 46}" class="s mute" font-size="13">${esc(nd[1])}</text>
<text x="${x + 18}" y="${y + 62}" class="s mute" font-size="13">${esc(nd[2] || '')}</text>`;
      k++;
      const last = ri === cfg.flow.length - 1 && ci === row.nodes.length - 1;
      const drop = ci === row.nodes.length - 1 ? 42 : gap;
      if (!last) out += `<path class="flow" d="M${x + bw - 40} ${y + bh}V${y + bh + drop - 5}" fill="none" stroke="${t.accent}" stroke-width="1.5"/><path d="M${x + bw - 44} ${y + bh + drop - 6}l4 5l4 -5" fill="none" stroke="${t.accent}" stroke-width="1.2"/>`;
      y += bh + gap;
    });
    y -= gap;
  });
  const h = y + 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(cfg.flowAlt)}">
${style(t)}
${frame(t, w, h)}
${out}
</svg>`;
}

// ---------------------------------------------------------------- social card (static)
const UP = (x) => esc(String(x).toUpperCase()); // rasterisers ignore text-transform
function social() {
  const t = THEMES.dark, w = 1280, h = 640;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${style(t, '*{animation:none!important}')}
${frame(t, w, h)}
<text x="80" y="112" class="m mute" font-size="17">${UP(cfg.domain)}</text>
<text x="1200" y="112" class="m acc" font-size="17" text-anchor="end">${UP(cfg.status)}</text>
<text x="76" y="286" class="s ink" font-size="112" font-weight="600" letter-spacing="-3">${esc(cfg.name)}</text>
<text x="80" y="346" class="s mute" font-size="30">${esc(cfg.mission)}</text>
<line x1="80" y1="500" x2="1200" y2="500" stroke="${t.rule}"/><rect x="80" y="499" width="110" height="2" fill="${t.accent}"/>
${cfg.facts.map(([k2, v], i) => `<text x="${80 + i * 330}" y="540" class="m mute" font-size="14">${UP(k2)}</text><text x="${80 + i * 330}" y="568" class="m ink" font-size="16">${UP(v)}</text>`).join('')}
<text x="1200" y="568" class="m mute" font-size="14" text-anchor="end">${UP(cfg.handle)}</text>
</svg>`;
}

const write = (name, svg) => {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, svg.replace(/\n+/g, '\n'));
  console.log(name.padEnd(28), fs.statSync(p).size, 'B');
};
for (const th of ['dark', 'light']) {
  write(`hero-${th}.svg`, hero(th, false));
  write(`hero-mobile-${th}.svg`, hero(th, true));
  write(`flow-${th}.svg`, flow(th));
  write(`flow-mobile-${th}.svg`, flowMobile(th));
  cfg.sections.forEach((s, i) => {
    const n = String(i + 1).padStart(2, '0');
    write(`rule-${n}-${th}.svg`, rule(th, i + 1, s, false));
    write(`rule-mobile-${n}-${th}.svg`, rule(th, i + 1, s, true));
  });
}
if (process.argv[4]) fs.writeFileSync(process.argv[4], social());
