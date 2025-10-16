const fs = require('fs');
const path = require('path');
const vars = JSON.parse(fs.readFileSync('docs/_meta/vars.json', 'utf8'));
function subst(s) {
  return s.replace(/\\\{\\{(\\w+)\\\}\}/g, (m, k) => vars[k] ?? m);
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      const out = subst(src);
      if (out !== src) fs.writeFileSync(p, out);
    }
  }
})('docs');
