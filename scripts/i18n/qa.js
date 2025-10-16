const fs = require('fs');
const path = require('path');
const baseDir = 'docs';
const trDir = 'i18n/es';
let fail = 0;
function get(d) {
  return fs.existsSync(d) ? fs.readFileSync(d, 'utf8') : '';
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && check(p);
  }
})('docs');
function check(src) {
  const slug = src.replace(/^docs\//, '');
  const tr = path.join(trDir, slug);
  const a = get(src);
  const b = get(tr);
  if (!b) return;
  const lenDelta = Math.abs(b.length - a.length) / Math.max(1, a.length);
  if (lenDelta > 1.5) {
    console.error('Large length delta for', slug);
    fail = 1;
  }
}
process.exit(fail);
