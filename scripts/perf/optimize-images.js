const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
async function processFile(p) {
  const dir = path.dirname(p),
    base = path.basename(p, path.extname(p));
  await sharp(p)
    .resize(1600)
    .toFile(path.join(dir, base + '.webp'));
  await sharp(p)
    .resize(800)
    .toFile(path.join(dir, base + '-800.webp'));
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.(png|jpe?g)$/i.test(f) && processFile(p);
  }
})('docs');
