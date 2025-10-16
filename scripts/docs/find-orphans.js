const fs = require('fs');
const path = require('path');
const sidebar = fs.readFileSync('docs-site/sidebars.js', 'utf8');
const mentioned = new Set(
  [...sidebar.matchAll(/["']([\w\-/]+)\b["']/g)].map((m) => m[1]),
);
const root = 'docs';
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
  }
})(root);
const orphans = files.filter((f) => {
  const slug = f.replace(/^docs\//, '').replace(/\.mdx?$/, '');
  return !Array.from(mentioned).some((m) => slug.endsWith(m));
});
if (orphans.length) {
  console.warn('Orphaned docs (not in sidebars):');
  for (const o of orphans) console.warn(' -', o);
}
fs.writeFileSync('docs-orphans.json', JSON.stringify(orphans, null, 2));
