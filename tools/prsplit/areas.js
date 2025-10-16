const { execSync } = require('child_process');
const diff = execSync(
  `git diff --name-only origin/${process.env.BASE || 'main'}...HEAD`,
)
  .toString()
  .trim()
  .split('\n');
const areas = {};
for (const f of diff) {
  const top = f.split('/')[0];
  areas[top] = areas[top] || [];
  areas[top].push(f);
}
process.stdout.write(JSON.stringify(areas, null, 2));
