const fs = require('fs');
const path = require('path');
const rx = /\]\(([^)#]+)#([^)]+)\)/g; // [text](/path#anchor)
const anchors = new Map(); // path -> Set(anchors)
// Load built anchor index if available
try {
  const idx = JSON.parse(fs.readFileSync('docs/ops/meta/anchors.json', 'utf8'));
  for (const [p, list] of Object.entries(idx)) anchors.set(p, new Set(list));
} catch {}
let missing = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && scan(p);
  }
})('docs');
function scan(p) {
  const md = fs.readFileSync(p, 'utf8');
  let m;
  while ((m = rx.exec(md))) {
    const to = m[1].replace(/\.mdx?$/, '');
    const a = m[2].toLowerCase();
    const set = anchors.get(to) || new Set();
    if (!set.has(a)) missing.push({ from: p, to, a });
  }
}
fs.mkdirSync('docs/ops/meta', { recursive: true });
fs.writeFileSync(
  'docs/ops/meta/missing-anchors.json',
  JSON.stringify(missing, null, 2),
);
console.log('Missing anchors:', missing.length);
if (missing.length) process.exit(1);
