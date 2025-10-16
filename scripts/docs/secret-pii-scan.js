const fs = require('fs');
const path = require('path');
const rxToken = /(sk_live|AKIA|AIza|ghp_|xox[baprs]-)[0-9A-Za-z\-\_]+/g;
function entropy(s) {
  const p = [...new Set(s)]
    .map((c) => s.split(c).length - 1)
    .map((f) => f / s.length);
  return -p.reduce((a, b) => a + b * Math.log2(b), 0);
}
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(mdx?|json|yaml|yml)$/i.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(rxToken)) {
        console.error(`Possible token in ${p}: ${m[0].slice(0, 6)}…`);
        fail = 1;
      }
      const chunks = src.split(/\s+/).filter((w) => w.length > 24);
      if (chunks.some((w) => entropy(w) > 4.0)) {
        console.error(`High-entropy strings in ${p}`);
      }
    }
  }
})('docs');
process.exit(fail);
