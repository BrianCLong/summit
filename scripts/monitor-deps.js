const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Running dependency check...');

  // Use npm audit or pnpm audit depending on the project
  // Since we see pnpm-lock.yaml in the file list, we assume pnpm
  try {
    execSync('pnpm audit --audit-level=high', { stdio: 'inherit' });
    console.log('Dependency check passed.');
  } catch (error) {
    console.error('Dependency check failed. High severity vulnerabilities found.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error running dependency check:', error);
  process.exit(1);
}
