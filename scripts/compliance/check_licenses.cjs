const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALLOWED_LICENSES = [
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
  'Python-2.0',
  'MPL-2.0',
  'BlueOak-1.0.0'
].join(';');

const DIRS_TO_CHECK = [
  '.',
  'server',
  'apps/web'
];

let hasError = false;

console.log('Starting License Compliance Check...');
console.log(`Allowed Licenses: ${ALLOWED_LICENSES.replace(/;/g, ', ')}`);

DIRS_TO_CHECK.forEach(dir => {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(path.join(fullPath, 'package.json'))) {
    console.warn(`Skipping ${dir}: package.json not found.`);
    return;
  }

  console.log(`\nChecking ${dir}...`);
  try {
    // We use --excludePrivatePackages to skip the root package if it's private.
    // However, if the root package is public and UNLICENSED, this won't help.
    // We also use --production to skip devDependencies which might have looser licenses.
    execSync(`npx license-checker --production --summary --excludePrivatePackages --onlyAllow "${ALLOWED_LICENSES}"`, {
      cwd: fullPath,
      stdio: 'inherit'
    });
    console.log(`✅ ${dir} passed.`);
  } catch (error) {
    // If the error message mentions the current package being UNLICENSED but it is private, it might be a false positive
    // But --excludePrivatePackages should handle it.
    // If it fails, it prints to stdio.
    console.error(`❌ ${dir} failed license check.`);
    hasError = true;
  }
});

if (hasError) {
  console.error('\nLicense check failed. Please review the errors above.');
  process.exit(1);
} else {
  console.log('\nAll license checks passed.');
}
