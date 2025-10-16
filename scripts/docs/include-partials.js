const fs = require('fs');
const path = require('path');
const rx = /<!--\s*include:([^\s]+)\s*-->/g;
function include(file) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(rx, (_, p) =>
    fs.readFileSync(path.join('docs/_includes', p), 'utf8'),
  );
  fs.writeFileSync(file, s);
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) include(p);
  }
})('docs');
