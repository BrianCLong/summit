const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const zlib = require('zlib');
const { execSync } = require('child_process');
const dir = process.argv[2] || 'docs/_packages/ingest';
const m = yaml.load(fs.readFileSync(path.join(dir, 'docpkg.yaml'), 'utf8'));
const files = m.exports;
const tmp = 'docpkg';
fs.mkdirSync(tmp, { recursive: true });
for (const f of files) {
  const out = path.join(tmp, f);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(f, out);
}
const tar = `${m.name}-${m.version}.tar`;
execSync(`tar -cf ${tar} -C ${tmp} .`);
const gz = `${tar}.gz`;
fs.writeFileSync(gz, zlib.gzipSync(fs.readFileSync(tar)));
fs.mkdirSync('dist/docpkg', { recursive: true });
fs.renameSync(gz, `dist/docpkg/${gz}`);
console.log('Packed', `dist/docpkg/${gz}`);
