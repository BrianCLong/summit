import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { checkMixedTestRunners, PackageJson } from './shared';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface Blocker {
  id: string;
  message: string;
  file: string;
}

async function main() {
  const packageJsonPaths = await glob('**/package.json', { ignore: '**/node_modules/**' });
  const blockers: Blocker[] = [];

  for (const pkgPath of packageJsonPaths) {
    const pkgContent = await readFile(pkgPath, 'utf-8');
    const pkgJson = JSON.parse(pkgContent) as PackageJson;

    // Check for build script
    if (!pkgJson.scripts?.build) {
      blockers.push({ id: 'P1-BUILD-001', message: 'Missing "build" script', file: pkgPath });
    }

    // Check for test script
    if (!pkgJson.scripts?.test) {
      blockers.push({ id: 'P1-TEST-002', message: 'Missing "test" script', file: pkgPath });
    }

    if (await checkMixedTestRunners(pkgPath)) {
      blockers.push({ id: 'P1-DEBT-001', message: 'Mixed test runners (Jest and Vitest)', file: pkgPath });
    }
  }

  // Check for mobile-interface build failure
  try {
    console.log('🚀 Checking apps/mobile-interface build...');
    execSync('cd apps/mobile-interface && pnpm build', { stdio: 'inherit' });
  } catch (err) {
    blockers.push({ id: 'P0-BUILD-002', message: 'apps/mobile-interface build failed', file: 'apps/mobile-interface' });
  }

  // Check for a11y-lab test failure
  try {
    console.log('🚀 Checking apps/a11y-lab tests...');
    execSync('cd apps/a11y-lab && pnpm test', { stdio: 'inherit' });
  } catch (err) {
    blockers.push({ id: 'P1-TEST-001', message: 'apps/a11y-lab tests failed', file: 'apps/a11y-lab' });
  }

  // Check for Zod version mismatch
  try {
    console.log('🚀 Checking for Zod version mismatch...');
    const lockfilePath = path.resolve(process.cwd(), 'pnpm-lock.yaml');
    const lockfileContent = await readFile(lockfilePath, 'utf-8');
    const lockfile = yaml.load(lockfileContent) as any;
    const zodVersions = new Set<string>();
    for (const key in lockfile.packages) {
      if (key.startsWith('/zod/')) {
        zodVersions.add(key.split('/')[2]);
      }
    }
    if (zodVersions.size > 1) {
      blockers.push({ id: 'P1-DEBT-002', message: `Zod version mismatch found: ${[...zodVersions].join(', ')}`, file: 'pnpm-lock.yaml' });
    }
  } catch (err) {
    blockers.push({ id: 'P1-DEBT-002', message: 'Failed to check for Zod version mismatch', file: 'pnpm-lock.yaml' });
  }


  if (blockers.length > 0) {
    console.error('🚨 Operational Readiness Blockers Detected:');
    blockers.forEach(blocker => {
      console.error(`  - [${blocker.id}] ${blocker.message} (in ${blocker.file})`);
    });
    process.exit(1);
  } else {
    console.log('✅ Operational Readiness Check Passed.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
