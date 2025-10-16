const fs = require('fs');
const syn = JSON.parse(
  fs.readFileSync('docs-site/algolia.synonyms.json', 'utf8'),
);
fs.mkdirSync('docs/ops/search', { recursive: true });
fs.writeFileSync(
  'docs/ops/search/typesense.synonyms.json',
  JSON.stringify(syn, null, 2),
);
