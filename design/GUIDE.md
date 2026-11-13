# Portfolio README kit

One design system for every repository of the same owner. The approved pilot is `quakescore`:
`TEMPLATE-README.md` here is its README, `projects/quakescore.json` its config, `motifs/spectrum.mjs` its motif.
Read all three before writing anything.

Kit folder (call it KIT): the folder this file is in.

## Files you produce for repo `<name>`

1. `KIT/projects/<name>.json`  (config, same keys as quakescore.json)
2. `KIT/motifs/<motif>.mjs`    (one new motif, a name of your choice, set as `"motif"` in the config)
3. `<repo>/.github/assets/*`   (generated, never hand-edited)
4. `<repo>/README.md`          (rewritten)

Do not edit `KIT/build.mjs`, another project's config or another motif.

## Build commands

```
node KIT/build.mjs KIT/projects/<name>.json <repo>/.github/assets KIT/out/<name>-social.svg
node <motion>/shot.cjs KIT/out/<name>-social.svg <repo>/.github/assets/social-preview.png 1280
```
(create `KIT/out` if missing). To LOOK at an SVG, rasterise it and Read the PNG:
`node <motion>/shot.cjs <file.svg> KIT/out/<name>-check.png 1200`
The raster is the first animation frame and ignores `text-transform`, so labels show in lower case there; that is expected.
You must look at hero-dark, hero-light, hero-mobile-dark, flow-dark and flow-mobile-dark before you finish, and fix overlaps or clipped text.

## Visual rules (hard)

- Black, white and neutral greys only. No colour anywhere. Use only the theme tokens passed in `t`:
  `t.bg, t.panel, t.rule, t.faint, t.ink, t.mute, t.accent` (accent is pure white in dark, pure black in light).
- No logos, no brand marks, no emoji, no badges, no third-party images or hotlinks.
- Motion is slow and subtle: line draws, sweeps, fades, pulsing nodes. Loops of 6 s or longer. Nothing flashes.
- Monospace labels in capitals via class `m` (already letter-spaced and upper-cased by CSS). Body type class `s`.

## Config notes

- `name`: display name. `handle`: `hesselb20-ctrl / <repo>`. `domain`: two or three words naming the field.
- `status`: short and true, e.g. `Prototype · tested on one example`. Max about 40 characters; it sits top right of the hero next to `domain`, so check they do not collide.
- `mission`: one line, max about 60 characters, plain statement of what it does. `missionLines`: the same text split in two lines for phones.
- `facts`: exactly three `[label, value]` pairs, each value max about 28 characters, each traceable to the code. One should state the honest validation state.
- `sections`: keep the seven names exactly as in quakescore.json.
- `flow`: exactly three lanes of exactly three nodes: `[TITLE, line 1, line 2]`. Title max 16 characters, lines max about 32 characters. It must describe the real data flow of the code. `flowAlt`: one-paragraph text equivalent.

## Motif contract

`export default function motif({ t, x, y, w, h, rng, esc })` returns an SVG fragment string drawn inside the box
(x, y, w, h). It is called with a 278x150 box (desktop hero) and a 360x110 box (phone hero), so lay out from w and h,
never from fixed numbers. Available CSS classes: `m s ink mute acc pulse flow`; keyframes `pulse dash fade sweep`
(see `style()` in build.mjs). You may use inline `style="animation:..."`, SMIL `<animate>`, and `rng(seed)` for
deterministic noise. Keep it under about 6 kB of output. It must say something true about how the project works
(quakescore: a peak emerging from noise as nights are stacked), with one or two small `m` labels at 9-10 px.
Leave about 12 px of headroom at the top for the label and keep everything inside the box.

## README rules (hard)

Structure, in this order, exactly as TEMPLATE-README.md does it, with the same `<picture>` blocks
(only the alt texts change):

1. Hero picture
2. 01 What it is: two or three sentences a non-expert understands, then one plain sentence on status
3. 02 Why it exists: the problem, what was missing, who it is for
4. 03 How it works: the flow picture, then a short numbered walkthrough
5. 04 Capabilities: tight list of what the code does today, each with its path; then known limits
6. 05 Quick start: only commands you ran yourself in this session, with the result you saw
7. 06 Stack, status, roadmap: small tables; roadmap only from what the repo itself states
8. 07 License

- Every claim must be traceable to code, config, tests or the repo's own docs. No invented features, numbers,
  users, benchmarks or badges. If it is a prototype, say so plainly. If something was never run on real
  hardware / real data / a live API, say so.
- Do not trust the old README; verify against the code. You may reuse its facts once verified.
- Copy style: short declarative sentences. Mission first. No hype words (powerful, seamless, blazing, revolutionary,
  cutting-edge, robust, effortless, unlock, supercharge...). No emoji. No exclamation marks. No em dashes.
- Quick start: say which OS and runtime versions you ran on. Anything you could not run (needs an API key, a phone,
  a compiler that is not installed) goes in a sentence that says it was not run here, or is left out with a link to the doc.
- Old media: do not delete any file. Do not show the old marketing renders (hero.png, explainer stills, tutorial GIFs).
  You MAY keep at most one existing asset if it is a recording or screenshot of the real project running; say what it shows.
  Link an existing tutorial video from a Documents table instead of embedding it.
- License section: if a LICENSE file exists, name it and link it. If none exists write exactly:
  "No license file yet. All rights reserved until one is added."
- Relative links must point at files that exist. Check every one.

## Git rules (hard)

In the repo: `git checkout -b readme-redesign`, `git config user.name "Hessel"`,
`git config user.email "hesselb20-ctrl@users.noreply.github.com"`.
Commit only `README.md` and `.github/assets/`. One commit, plain message, NO Co-Authored-By line, no
"Generated with" line. Do NOT push. Do not change code, config, CI or any other file. `git status` must be clean
at the end apart from ignored build output; revert line-ending-only changes with `git checkout -- <file>`.
Python environments go under `<envs>\rd-<name>` (session paths are too long for some native wheels;
only Python 3.15 is the system default, use `python -m uv venv --python 3.11 <path>` when a package needs an older one).
