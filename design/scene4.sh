#!/usr/bin/env bash
# Evidence figures (kit4, white background). Scene file: src/v4/<id>.tsx with a default export.
# scene4.sh still <id> <frame> [frame...]   writes out/v2-<id>-<frame>.png  (look at them with Read)
# scene4.sh webp <id> <assetsDir> [q]       writes <assetsDir>/scene.webp (animated, looping). q = quality 30..70, default 48
set -e
cd <motion>
B=--browser-executable=<headless-browser>/chrome-headless-shell.exe
mode=$1
id=$2
E="src/entry-v4-$id.tsx"
cat > "$E" <<ENTRY
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import Scene from './v4/$id';
registerRoot(() => (<Composition id="v4-$id" component={Scene} width={960} height={480} fps={20} durationInFrames={240} />));
ENTRY
if [ "$mode" = still ]; then
  shift 2
  for f in "$@"; do
    npx remotion still "$E" "v4-$id" "out/v4-$id-$f.png" --frame="$f" --gl=angle $B 2>&1 | grep -iE "error|cannot|failed|not found|undefined" || true
    echo "<motion>/out/v4-$id-$f.png"
  done
else
  dst=$3
  q=${4:-50}
  mkdir -p "$dst"
  rm -rf "out/seq4-$id"
  npx remotion render "$E" "v4-$id" "out/seq4-$id" --sequence --image-format=png --gl=angle --concurrency=2 $B 2>&1 | grep -iE "error|cannot|failed|not found|undefined" || true
  ffmpeg -y -v error -framerate 20 -i "out/seq4-$id/element-%03d.png" -c:v libwebp -lossless 0 -q:v "$q" -compression_level 6 -loop 0 -an "$dst/scene.webp"
  rm -rf "out/seq4-$id"
  ls -la "$dst/scene.webp" | awk '{print $5, $9}'
fi
