#!/usr/bin/env bash
# scene.sh still <id> [frame]            writes out/<id>-dark-<frame>.png and out/<id>-light-<frame>.png
# scene.sh gif <id> <assetsDir> [name]   writes <assetsDir>/<name>-dark.gif and <name>-light.gif (name defaults to scene)
set -e
cd <motion>
B=--browser-executable=<headless-browser>/chrome-headless-shell.exe
mode=$1
id=$2
# one entry file per scene, so a broken scene from someone else cannot break this build
E="src/entry-$id.tsx"
cat > "$E" <<ENTRY
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import Scene from './scenes/$id';
registerRoot(() => (<>{(['dark', 'light'] as const).map((theme) => (
  <Composition key={theme} id={"$id-" + theme} component={Scene} defaultProps={{ theme }} width={800} height={450} fps={12} durationInFrames={96} />
))}</>));
ENTRY
if [ "$mode" = still ]; then
  f=${3:-24}
  for t in dark light; do
    npx remotion still "$E" "$id-$t" "out/$id-$t-$f.png" --frame="$f" --gl=angle $B 2>&1 | grep -iE "error|cannot|failed|not found" || true
    echo "<motion>/out/$id-$t-$f.png"
  done
else
  dst=$3
  name=${4:-scene}
  mkdir -p "$dst"
  for t in dark light; do
    rm -rf "out/seq-$id-$t"
    npx remotion render "$E" "$id-$t" "out/seq-$id-$t" --sequence --image-format=png --gl=angle --concurrency=2 $B 2>&1 | grep -iE "error|cannot|failed|not found" || true
    ffmpeg -y -v error -framerate 12 -i "out/seq-$id-$t/element-%02d.png" -vf "split[a][b];[a]palettegen=max_colors=24:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" "$dst/$name-$t.gif"
    rm -rf "out/seq-$id-$t"
    ls -la "$dst/$name-$t.gif" | awk '{print $5, $9}'
  done
fi
