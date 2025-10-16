const { execSync } = require('child_process');
const diff = execSync(
  `git diff --name-only origin/${process.env.GITHUB_BASE_REF || 'main'}...HEAD`,
)
  .toString()
  .trim()
  .split('\n');
const roots = [...new Set(diff.map((f) => f.split('/')[0]))];
process.stdout.write(roots.join(','));
