import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const scriptPath = path.join(root, '.github', 'scripts', 'verify-evidence.mjs');
const fixtures = [
  'invalid-evidence-index.json',
  'invalid-evidence-item.json',
];

fixtures.forEach((fixture) => {
  const fixturePath = path.join(root, '.github', 'scripts', 'fixtures', fixture);
  const result = spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, EVIDENCE_INDEX_PATH: fixturePath },
    encoding: 'utf8',
  });

  if (result.status === 0) {
    throw new Error(`Expected failure for fixture: ${fixture}`);
  }
});

console.log('evidence fixture checks: ok');
