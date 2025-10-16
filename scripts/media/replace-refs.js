const fs = require('fs');
const path = require('path');
const map = JSON.parse(fs.readFileSync('docs/ops/media/hash-map.json', 'utf8'));
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && rewrite(p);
  }
})('docs');
function rewrite(p) {
  let src = fs.readFileSync(p, 'utf8');
  for (const [oldp, newp] of Object.entries(map)) {
    src = src.replace(
      new RegExp(oldp.replace(/[.*+?^${}()|[\\]/g, '\\$&'), 'g'),
      newp,
    );
  }
  fs.writeFileSync(p, src);
}
