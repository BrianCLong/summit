const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const rows = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      const fm = matter(src).data || {};
      rows.push({
        slug: p.replace(/^docs\//, '').replace(/\.mdx?$/, ''),
        title: fm.title || path.basename(p),
        tags: fm.tags || [],
        summary: fm.summary || '',
      });
    }
  }
})('docs');
fs.mkdirSync('docs/ops/help', { recursive: true });
fs.writeFileSync('docs/ops/help/index.json', JSON.stringify(rows, null, 2));
