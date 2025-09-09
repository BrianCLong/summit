const fs = require('fs');
const path = require('path');
const allowed = new Set(fs.readFileSync('docs/_meta/allowed-domains.txt','utf8').split(/\r?\n/).filter(Boolean));
let fail = false;
(function walk(d){
  for (const f of fs.readdirSync(d)){
    const p = path.join(d,f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p); else if (/\.mdx?$/.test(f)){
      const md = fs.readFileSync(p,'utf8');
      for (const m of md.matchAll(/\]\((https?:\/\/[^)]+)\)/g)){
        const host = new URL(m[1]).host.replace(/^www\./,'');
        if (![...allowed].some(d=>host.endsWith(d))) { console.error(`Disallowed external link in ${p}: ${m[1]}`); fail = true; }
      }
    }
  }
})('docs');
process.exit(fail?1:0);
