const fs=require('fs');
const path=require('path');
const yaml=require('js-yaml');
const https=require('https');
const { spawnSync } = require('child_process');
const lock=yaml.safeLoad(fs.readFileSync('docs/docpkg.lock','utf8'));
function fetch(url){ return new Promise((res)=>https.get(url,(r)=>{ const chunks=[]; r.on('data',d=>chunks.push(d)); r.on('end',()=>res(Buffer.concat(chunks))); })); }
(async()=>{
  for(const d of lock.deps){ 
    const buf=await fetch(d.url); 
    const tgz='pkg.tgz'; 
    fs.writeFileSync(tgz, buf); 
    const vendorDir = path.join('vendor', d.name);
    fs.mkdirSync(vendorDir, { recursive: true });
    spawnSync('tar', ['-xzf', tgz, '-C', vendorDir]);
  }
})();