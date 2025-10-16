const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const idx = yaml.load(fs.readFileSync('docs/_meta/features.yml', 'utf8'));
let missing = [];
for (const f of idx.features) {
  for (const k of ['howto', 'reference']) {
    const p = f.docs?.[k];
    if (!p || !fs.existsSync(path.join('docs', p)))
      missing.push(`${f.id}:${k}`);
  }
}
if (missing.length) {
  console.error('Missing docs artifacts:', missing.join(', '));
  process.exit(1);
}
