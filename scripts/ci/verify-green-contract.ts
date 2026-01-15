import { glob } from 'glob';
import { checkMixedTestRunners } from '../ops/shared';

interface Violation {
  id: string;
  message: string;
  file: string;
}

async function main() {
  const packageJsonPaths = await glob('**/package.json', { ignore: '**/node_modules/**' });
  const violations: Violation[] = [];

  for (const pkgPath of packageJsonPaths) {
    if (await checkMixedTestRunners(pkgPath)) {
      violations.push({ id: 'GREEN-CI-001', message: 'Mixed test runners (Jest and Vitest)', file: pkgPath });
    }
  }

  if (violations.length > 0) {
    console.error('🚨 Green CI Contract Violations Detected:');
    violations.forEach(violation => {
      console.error(`  - [${violation.id}] ${violation.message} (in ${violation.file})`);
    });
    process.exit(1);
  } else {
    console.log('✅ Green CI Contract Verified.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
