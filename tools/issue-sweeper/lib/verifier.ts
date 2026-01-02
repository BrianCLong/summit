/**
 * CI/CD verification and quality gate checks
 */

import { execSync } from 'child_process';

export interface VerificationResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    output?: string;
    duration?: number;
  }[];
  summary: string;
}

/**
 * Run full verification suite
 */
export async function runFullVerification(): Promise<VerificationResult> {
  console.log(`   🧪 Running full verification suite...`);

  const checks = [
    { name: 'TypeScript', command: 'pnpm typecheck', required: true },
    { name: 'Linting', command: 'pnpm lint', required: true },
    { name: 'Quick Tests', command: 'pnpm test:quick', required: false },
  ];

  const results: VerificationResult['checks'] = [];
  let allPassed = true;

  for (const check of checks) {
    const start = Date.now();
    console.log(`      🔍 ${check.name}...`);

    try {
      const output = execSync(check.command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000, // 2 minute timeout
      });

      const duration = Date.now() - start;
      results.push({
        name: check.name,
        passed: true,
        output: output.substring(0, 500), // Limit output
        duration,
      });

      console.log(`      ✅ ${check.name} passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const output = error instanceof Error && 'stdout' in error
        ? String(error.stdout)
        : String(error);

      results.push({
        name: check.name,
        passed: false,
        output: output.substring(0, 500),
        duration,
      });

      console.log(`      ❌ ${check.name} failed (${duration}ms)`);

      if (check.required) {
        allPassed = false;
      }
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const summary = `${passedCount}/${results.length} checks passed`;

  return {
    passed: allPassed,
    checks: results,
    summary,
  };
}

/**
 * Run quick verification (typecheck + lint only)
 */
export async function runQuickVerification(): Promise<VerificationResult> {
  console.log(`   ⚡ Running quick verification...`);

  const checks = [
    { name: 'TypeScript', command: 'pnpm typecheck' },
    { name: 'Linting', command: 'pnpm lint' },
  ];

  const results: VerificationResult['checks'] = [];
  let allPassed = true;

  for (const check of checks) {
    const start = Date.now();

    try {
      const output = execSync(check.command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 60000, // 1 minute timeout
      });

      const duration = Date.now() - start;
      results.push({
        name: check.name,
        passed: true,
        output: output.substring(0, 500),
        duration,
      });

      console.log(`      ✅ ${check.name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const output = error instanceof Error && 'stdout' in error
        ? String(error.stdout)
        : String(error);

      results.push({
        name: check.name,
        passed: false,
        output: output.substring(0, 500),
        duration,
      });

      console.log(`      ❌ ${check.name} (${duration}ms)`);
      allPassed = false;
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const summary = `${passedCount}/${results.length} checks passed`;

  return {
    passed: allPassed,
    checks: results,
    summary,
  };
}

/**
 * Verify specific files only
 */
export async function verifyFiles(files: string[]): Promise<VerificationResult> {
  console.log(`   📄 Verifying ${files.length} files...`);

  const results: VerificationResult['checks'] = [];
  let allPassed = true;

  // TypeScript check on specific files
  const tsFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  if (tsFiles.length > 0) {
    const start = Date.now();
    try {
      execSync(`pnpm typecheck`, { stdio: 'pipe', timeout: 60000 });
      results.push({
        name: 'TypeScript',
        passed: true,
        duration: Date.now() - start,
      });
    } catch {
      results.push({
        name: 'TypeScript',
        passed: false,
        duration: Date.now() - start,
      });
      allPassed = false;
    }
  }

  // Lint specific files
  if (files.length > 0) {
    const start = Date.now();
    try {
      execSync(`pnpm eslint ${files.join(' ')}`, { stdio: 'pipe', timeout: 60000 });
      results.push({
        name: 'Linting',
        passed: true,
        duration: Date.now() - start,
      });
    } catch {
      results.push({
        name: 'Linting',
        passed: false,
        duration: Date.now() - start,
      });
      allPassed = false;
    }
  }

  return {
    passed: allPassed,
    checks: results,
    summary: `Verified ${files.length} files`,
  };
}

/**
 * Check if repository is clean (no uncommitted changes)
 */
export function isRepoClean(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status.trim().length === 0;
  } catch {
    return false;
  }
}

/**
 * Get list of changed files
 */
export function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    return output.trim().split('\n').filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

/**
 * Run build verification
 */
export async function verifyBuild(): Promise<boolean> {
  console.log(`   🏗️  Running build...`);

  try {
    execSync('pnpm build', {
      stdio: 'pipe',
      timeout: 300000, // 5 minute timeout
    });
    console.log(`   ✅ Build succeeded`);
    return true;
  } catch (error) {
    console.log(`   ❌ Build failed`);
    return false;
  }
}

/**
 * Get CI status from GitHub Actions
 */
export async function getCIStatus(branchName: string): Promise<'success' | 'failure' | 'pending' | 'unknown'> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return 'unknown';
  }

  try {
    // Get latest commit on branch
    const commitSha = execSync(`git rev-parse ${branchName}`, { encoding: 'utf-8' }).trim();

    // Query GitHub API for check runs
    const response = await fetch(
      `https://api.github.com/repos/BrianCLong/summit/commits/${commitSha}/check-runs`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      return 'unknown';
    }

    const data = await response.json();
    const checkRuns = data.check_runs || [];

    if (checkRuns.length === 0) {
      return 'pending';
    }

    const hasFailure = checkRuns.some((run: any) => run.conclusion === 'failure');
    const allComplete = checkRuns.every((run: any) => run.status === 'completed');

    if (hasFailure) {
      return 'failure';
    }

    if (allComplete) {
      return 'success';
    }

    return 'pending';
  } catch {
    return 'unknown';
  }
}
