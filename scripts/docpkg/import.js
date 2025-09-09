const fs=require('fs');
const path=require('path');
const yaml=require('js-yaml');
const https=require('https');
const lock=yaml.load(fs.readFileSync('docs/docpkg.lock','utf8'));
function fetch(url){ return new Promise((res)=>https.get(url,(r)=>{ const chunks=[]; r.on('data',d=>chunks.push(d)); r.on('end',()=>res(Buffer.concat(chunks))); })); }
(async()=>{
  for(const d of lock.deps){ const buf=await fetch(d.url); const tgz='pkg.tgz'; fs.writeFileSync(tgz, buf); require('child_process').execSync(`mkdir -p vendor/${d.name} && tar -xzf ${tgz} -C vendor/${d.name}`); }})();