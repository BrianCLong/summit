const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const content = fs.readFileSync(packageJsonPath, 'utf8');
const pkg = JSON.parse(content);

let hasChanges = false;

function sortObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
}

function checkAndSort(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  const stack = [];

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return;
    stack.push({ parent: current, key: parts[i] });
    current = current[parts[i]];
  }

  const lastKey = parts[parts.length - 1];
  if (current[lastKey]) {
    const original = JSON.stringify(current[lastKey]);
    const sorted = sortObject(current[lastKey]);
    const sortedStr = JSON.stringify(sorted);

    if (original !== sortedStr) {
      console.log(`[Sort Check] ${keyPath} is not sorted.`);
      current[lastKey] = sorted;
      hasChanges = true;
    }
  }
}

// Check common conflict areas
checkAndSort(pkg, 'pnpm.overrides');
checkAndSort(pkg, 'resolutions');
checkAndSort(pkg, 'overrides');
checkAndSort(pkg, 'dependencies');
checkAndSort(pkg, 'devDependencies');
checkAndSort(pkg, 'peerDependencies');
checkAndSort(pkg, 'scripts');

if (hasChanges) {
  if (process.argv.includes('--fix')) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[Sort Check] Fixed package.json sorting.');
  } else {
    console.error('[Sort Check] package.json sections are not sorted. Run with --fix to sort.');
    process.exit(1);
  }
} else {
  console.log('[Sort Check] package.json is sorted.');
}
