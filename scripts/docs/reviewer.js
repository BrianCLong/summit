const fs = require('fs');
const { execSync } = require('child_process');
const changed = execSync(
  `git diff --name-only origin/${process.env.GITHUB_BASE_REF || 'main'}...`,
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');
const tips = [];
if (changed.some((f) => f.startsWith('docs/how-to/')))
  tips.push(
    '- Ensure **Prerequisites**, **Steps**, **Validation**, **Troubleshooting** present.',
  );
if (changed.some((f) => /\.(png|jpg|jpeg|svg)$/i.test(f)))
  tips.push('- Add **alt text** and update **ATTRIBUTIONS.md** if external.');
if (changed.some((f) => f.includes('releases/')))
  tips.push(
    '- Link release notes from **/releases/index** and update **/reference/deprecations** if needed.',
  );
if (!tips.length) tips.push('- Looks good. Ensure sidebars link is present.');
fs.writeFileSync('review-tips.md', tips.join('\n'));
