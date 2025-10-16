const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function sha256(p) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(p))
    .digest('hex')
    .slice(0, 16);
}
const imgs = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory()
      ? walk(p)
      : /\.(png|jpe?g|gif|svg)$/i.test(f) && imgs.push(p);
  }
})('docs');
const map = new Map();
for (const p of imgs) {
  const h = sha256(p);
  const ext = path.extname(p);
  const dir = path.dirname(p);
  const newp = path.join(dir, `${h}${ext}`);
  if (!fs.existsSync(newp)) fs.copyFileSync(p, newp);
  map.set(p.replace(/^docs\//, ''), newp.replace(/^docs\//, ''));
}
fs.writeFileSync(
  'docs/ops/media/hash-map.json',
  JSON.stringify(Object.fromEntries(map), null, 2),
);
