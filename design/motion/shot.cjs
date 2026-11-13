// node shot.cjs <in.svg> <out.png> [width]  -> static raster of an SVG for a quick look
const sharp = require('sharp');
const [, , i, o, w] = process.argv;
sharp(i, { density: 192 }).resize(Number(w) || 1200).png().toFile(o).then((r) => console.log(o, r.width + 'x' + r.height));
