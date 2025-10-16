const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

execSync('cd docs-site && npm i && npm run build', { stdio: 'inherit' });
const root = 'docs-site/build';
const manifest = [];
function hash(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else {
      manifest.push({
        path: p.replace(/^docs-site\/build\//, ''),
        sha256: hash(p),
        bytes: s.size,
      });
    }
  }
})(root);
fs.writeFileSync(
  'offline-manifest.json',
  JSON.stringify(
    { created: new Date().toISOString(), files: manifest },
    null,
    2,
  ),
);
execSync('zip -r offline-docs.zip docs-site/build offline-manifest.json', {
  stdio: 'inherit',
});
console.log('Wrote offline-docs.zip');
