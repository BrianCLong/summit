const fs = require('fs');
const path = require('path');
const dir = 'docs/ops/health/data';
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();
fs.writeFileSync(
  path.join(dir, 'index.json'),
  JSON.stringify({ files }, null, 2),
);
