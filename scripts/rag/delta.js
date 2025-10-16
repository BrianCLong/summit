const fs = require('fs');
const { execSync } = require('child_process');
const base = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : 'origin/main';
const changed = execSync(`git diff --name-only ${base}... -- docs`, {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);
fs.writeFileSync(
  'docs/ops/rag/delta.json',
  JSON.stringify({ changed }, null, 2),
);
