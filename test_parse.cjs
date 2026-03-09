const fs = require('fs');
try {
  JSON.parse(fs.readFileSync('apps/intelgraph-api/package.json', 'utf8'));
  console.log('Valid JSON');
} catch (e) {
  console.error('Invalid JSON:', e);
}
