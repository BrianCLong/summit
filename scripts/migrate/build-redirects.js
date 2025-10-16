const fs = require('fs');
const yaml = require('js-yaml');
const map = yaml.load(fs.readFileSync('docs/_meta/redirects.yml', 'utf8'));
fs.writeFileSync(
  'docs-site/static/_redirects',
  map.map((r) => `${r.from} ${r.to} 301`).join('\n'),
);
fs.writeFileSync('docs/ops/meta/redirects.json', JSON.stringify(map, null, 2));
