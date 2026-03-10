import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('.github/workflows');
let modifiedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let newLines = [];
  let pnpmSetupIndex = -1;
  let pnpmSetupLines = [];
  let nodeSetupIndex = -1;
  let nodeSetupLines = [];

  // A more robust way is to just do a simple search and replace or match blocks,
  // but looking at the error, it's specific to the 'Quarantine Tests (Flaky)'
  // and 'Security Gate (Gitleaks + Snyk)' jobs.
  // Wait, looking at the previous grep, the order is actually:
  // pnpm/action-setup
  // actions/setup-node
  // So the problem might be that setup-node is not finding pnpm because we didn't specify the `cache: 'pnpm'` correctly,
  // or because of `version` in pnpm/action-setup being removed so it defaults to packageManager from package.json,
  // but node is not set up before pnpm/action-setup?
  // Let me read the repository memory carefully:
  // "For GitHub Actions workflows, always use pnpm/action-setup combined with pnpm install.
  // It must run *before* actions/setup-node to avoid 'Unable to locate executable file: pnpm' errors.
  // Do not hardcode the version in pnpm/action-setup if packageManager is defined in package.json."
}
