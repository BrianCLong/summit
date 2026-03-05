import fs from 'fs';
import path from 'path';

const checks = [
  'src/evals',
  'src/graph',
  'src/summit',
  'artifacts',
  '.github/workflows'
];

const results = checks.map(p => ({
  path: p,
  exists: fs.existsSync(path.resolve(process.cwd(), p))
}));

console.log(JSON.stringify(results, null, 2));
