const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = 'docs-site/build';
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : files.push(p);
  }
})(root);
const manifest = files.map((p) => ({
  path: p.replace(/^docs-site\/build\//, ''),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
  bytes: fs.statSync(p).size,
}));
fs.writeFileSync(
  'deploy-manifest.json',
  JSON.stringify(
    { created: new Date().toISOString(), files: manifest },
    null,
    2,
  ),
);
console.log('Wrote deploy-manifest.json with', manifest.length, 'files');
