const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const ui = JSON.parse(
  fs.readFileSync('docs/ops/ui/ui-catalog.json', 'utf8'),
).catalog;
const labels = new Set(Object.values(ui).flat());
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && pages.push(p);
  }
})('docs');
const drift = [];
for (const p of pages) {
  const src = fs.readFileSync(p, 'utf8');
  // Extract quoted UI tokens (e.g., menu labels)
  const hits = [...src.matchAll(/`([^`]{2,40})`|\*\*([^*]{2,40})\*\*/g)].map(
    (m) => (m[1] || m[2] || '').trim(),
  );
  for (const h of hits) {
    if (h && !labels.has(h)) drift.push({ page: p, token: h });
  }
}
fs.writeFileSync('docs/ops/ui/drift.json', JSON.stringify(drift, null, 2));
console.log('Drift tokens:', drift.length);
