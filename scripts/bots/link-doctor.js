const fs = require('fs');
const path = require('path');
const map = JSON.parse(fs.readFileSync('docs/_meta/link-map.json', 'utf8'));
let changes = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      let src = fs.readFileSync(p, 'utf8');
      let out = src;
      for (const [from, to] of Object.entries(map)) {
        const rx = new RegExp(from.replace(/[.*+?^${}()|[\\]/g, '\\$&'), 'g');
        out = out.replace(rx, to);
      }
      if (out !== src) {
        fs.writeFileSync(p, out);
        changes++;
      }
    }
  }
})('docs');
console.log('Link doctor changes:', changes);
