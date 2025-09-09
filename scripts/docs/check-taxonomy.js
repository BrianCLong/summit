const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const tax = yaml.load(fs.readFileSync('docs/_meta/taxonomy.yml','utf8'));
const allowed = new Set(Object.values(tax.facets).flat());
let fail=0;
(function walk(d){
  for (const f of fs.readdirSync(d)) {
    const p=path.join(d,f);
    const s=fs.statSync(p);
    s.isDirectory()?walk(p):/\.mdx?$/.test(f)&&check(p);
  }
})('docs');
function check(p){
  const src = fs.readFileSync(p,'utf8');
  const m = src.match(/\ntags:\s*\[(.*?)(\s*,
)?\]/);
  if(!m) return;
  const tags=m[1].split(',').map(x=>x.trim().replace(/^area:|^role:|^edition:/,''));
  for(const t of tags){
    if(t && !allowed.has(t)){
      console.error('Unknown tag', t, 'in', p);
      fail=1;
    }
  }
}
process.exit(fail);
