const { execSync } = require('child_process');
const madge = require('madge');
(async () => {
  const changed = execSync(
    'git diff --name-only origin/${GITHUB_BASE_REF}...HEAD',
  )
    .toString()
    .split('\n')
    .filter(Boolean);
  const graph = await madge('.', { tsConfig: './tsconfig.json' });
  const impacted = new Set();
  for (const f of changed) {
    for (const dep of graph.depends(f)) {
      impacted.add(dep);
    }
  }
  process.stdout.write(
    [...impacted].filter((x) => x.endsWith('.test.ts')).join('\n'),
  );
})();
