# Design system

Sources for the READMEs across these repositories.

- `build.mjs` generates the animated SVG hero, section rules and data-flow diagram for one project from `projects/<name>.json` and `motifs/<motif>.mjs`.
- `cards.mjs` generates the index cards on the profile page.
- `motion/` holds the 3D scenes (Remotion with React Three Fiber). One file per repository in `motion/src/scenes/`, rendered to GIF with `motion/scene.sh`.
- `GUIDE.md` and `SCENES.md` are the rules each README and scene follows.

Paths inside the scripts point at the machine they were written on and need adjusting before reuse.
