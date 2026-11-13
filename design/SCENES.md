# 3D scene per repository

Every repository README gets at least one 3D loop, built in code with Remotion + React Three Fiber
("Claude Motion"). The approved example is quakescore: a 3D district extruded from the data file its
dashboard reads, with one building swaying.

Motion project (call it M): `<motion>`

## What you write

One file: `M/src/scenes/<id>.tsx` where `<id>` is the repo name using only a-z, 0-9 and `-`
(for example `ghost-channel.tsx`). Default export: a React component taking `{ theme: 'dark' | 'light' }`.
Start by reading `M/src/kit.tsx` (all helpers) and `M/src/scenes/sample.tsx` (a working example); `M/src/QuakeCity.tsx`
is the approved quakescore scene, for the level of finish expected.
Do not edit kit.tsx, index.tsx, scene.sh, QuakeCity.tsx or anyone else's scene. Data files you need go in
`M/public/<id>-*.json` (load with `staticFile` + `delayRender`/`continueRender` as QuakeCity does) or are inlined
as constants if small.

## Commands (run from anywhere)

```
bash <motion>/scene.sh still <id> 24        # two PNGs; Read them to look
bash <motion>/scene.sh gif <id> <repo>/.github/assets scene   # scene-dark.gif + scene-light.gif
```
Look at stills from at least three frames (for example 0, 24, 60) in BOTH themes before rendering the GIFs.
A render takes one to three minutes; other renders may be running, so be patient and do not kill other processes.

## Rules (hard)

- TRUE to the repo: the scene must be built from real things in the repository: a committed data file, a real
  example output, the real geometry, or the real structure and constants of the algorithm (grid sizes, band
  counts, node counts, measured numbers). Read the data from the repo and convert it; do not invent values.
  Anything simulated, synthetic or exaggerated is labelled as such inside the scene.
- Monochrome: black, white, neutral greys, only through `PAL[theme]` tokens. No colour at all.
- FIXED camera (pass one constant `Cam`). Motion is local and slow: a sweep, a pulse, a small displacement,
  parts lighting in sequence. A slowly turning single simple object is allowed if the GIF stays small.
- Seamless loop: everything is a function of `phase` (0..1) through whole numbers of cycles.
- Format is fixed: 800x450, 12 fps, 96 frames (8 s).
- Size: each GIF under 1.2 MB, ideally under 800 kB. If it is larger, reduce what moves, not the resolution.
- In-scene text: small-caps mono labels via `labelStyle`, a two-line title top left (what it is; where the data
  comes from / what is simulated), optionally one leader label on the key object and a small legend bottom left.
  Keep labels clear of the geometry and inside the frame. No logos, no emoji, no brand names of other companies.
- It should read as a precise technical drawing, quiet and exact: thin edges, lots of negative space.

## README change

Insert directly after the numbered walkthrough in section 03 (before the 04 rule), exactly this shape:

```
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/scene-dark.gif">
  <img src=".github/assets/scene-light.gif" width="100%" alt="ONE SENTENCE DESCRIBING THE SCENE FOR SOMEONE WHO CANNOT SEE IT">
</picture>

<sub>One or two sentences: what is shown, which file the data comes from, what is simulated or exaggerated.</sub>
```

Then commit on the existing `readme-redesign` branch (same identity rules as GUIDE.md: user.name Hessel,
user.email hesselb20-ctrl@users.noreply.github.com, no Co-Authored-By, no push): add only README.md and
`.github/assets/scene-*.gif`. `git status` clean at the end.
