// Index cards for the profile README: node cards.mjs <outDir> <name>...   (reads projects/<name>.json)
import fs from 'node:fs';
import path from 'node:path';
const [, , outDir, ...names] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const SANS = "'Inter','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono','Cascadia Mono','Segoe UI Mono',Menlo,Consolas,'Liberation Mono',monospace";
const THEMES = {
  dark: { rule: '#2B2B2B', ink: '#EDEDED', mute: '#8C8C8C', accent: '#FFFFFF' },
  light: { rule: '#C8C8C8', ink: '#111111', mute: '#5F5F5F', accent: '#000000' },
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
for (const name of names) {
  const c = JSON.parse(fs.readFileSync(path.join(here, 'projects', name + '.json'), 'utf8'));
  for (const [th, t] of Object.entries(THEMES)) for (const mobile of [false, true]) {
    const w = mobile ? 420 : 800, h = mobile ? 104 : 78;
    const css = `<style>.s{font-family:${SANS}}.m{font-family:${MONO};letter-spacing:.14em;text-transform:uppercase}
@keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}@keyframes sweep{0%{transform:translateX(0)}100%{transform:translateX(var(--d))}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;
    const body = mobile
      ? `<text x="0" y="30" class="s" font-size="21" font-weight="600" fill="${t.ink}">${esc(c.indexName || c.name)}</text>
<text x="0" y="52" class="s" font-size="13" fill="${t.mute}">${esc(c.missionLines[0])}</text><text x="0" y="69" class="s" font-size="13" fill="${t.mute}">${esc(c.missionLines[1] || '')}</text>
<circle cx="4" cy="87" r="2.6" fill="${t.accent}" style="animation:pulse 5s ease-in-out infinite"/><text x="14" y="90.5" class="m" font-size="9" fill="${t.mute}">${esc(c.status)}</text>`
      : `<text x="0" y="32" class="s" font-size="22" font-weight="600" fill="${t.ink}">${esc(c.indexName || c.name)}</text>
<text x="0" y="56" class="s" font-size="14" fill="${t.mute}">${esc(c.mission)}</text>
<circle cx="${w - 4}" cy="24" r="2.6" fill="${t.accent}" style="animation:pulse 5s ease-in-out infinite"/><text x="${w - 14}" y="27.5" class="m" font-size="9.5" fill="${t.mute}" text-anchor="end">${esc(c.status)}</text>
<text x="${w}" y="57" class="m" font-size="9.5" fill="${t.ink}" text-anchor="end">${esc(c.domain)}  →</text>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(c.indexName || c.name)}: ${esc(c.mission)} Status: ${esc(c.status)}">
${css}
${body}
<line x1="0" y1="${h - 1}" x2="${w}" y2="${h - 1}" stroke="${t.rule}"/>
<rect x="0" y="${h - 2}" width="28" height="2" fill="${t.accent}" style="--d:${w - 28}px;animation:sweep 20s ease-in-out infinite alternate"/>
</svg>`;
    fs.writeFileSync(path.join(outDir, `card-${name}${mobile ? '-mobile' : ''}-${th}.svg`), svg);
  }
  console.log('cards', name);
}
