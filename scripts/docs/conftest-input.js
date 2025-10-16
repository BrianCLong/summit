const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const g = matter.read(p);
      out.push({
        path: p,
        frontmatter: g.data || {},
        content_matches_see_also: /##\s*See also/i.test(g.content),
      });
    }
  }
})('docs');
fs.writeFileSync('conftest.json', JSON.stringify(out, null, 2));
