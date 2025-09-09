const fs = require('fs');
const path = require('path');
function extractRegion(file, name){
  const s = fs.readFileSync(file,'utf8');
  const re = new RegExp(`// #region ${name}[\s\S]*?// #endregion ${name}`,'m');
  const m = s.match(re); if(!m) throw new Error(`Region ${name} not found in ${file}`);
  return m[0].split('\n').slice(1,-1).join('\n');
}
const map = [
  { from: 'packages/sdk-js/src/client.ts', region: 'create-client', to: 'docs/tutorials/first-ingest.md', marker: 'REGION:create-client' },
];
for (const m of map){
  const code = extractRegion(m.from, m.region);
  const md = fs.readFileSync(m.to,'utf8').replace(new RegExp(`<!-- ${m.marker} -->[\s\S]*?<!-- /${m.marker} -->`,'m'), `<!-- ${m.marker} -->\n\n\
```ts\
${code}\
```\
\n<!-- /${m.marker} -->`);
  fs.writeFileSync(m.to, md);
}