import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

// --- Helpers ---
const CONFIG_PATH = path.join(process.cwd(), 'config', 'integrity-budgets.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ Config not found at ${CONFIG_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')).budgets;
}

function runCommand(cmd, ignoreErrorCodes = []) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    if (ignoreErrorCodes.includes(error.status)) {
      return '';
    }
    // If it's a command not found or other error, we might want to know
    // But for grep, status 1 means no matches found, which is fine.
    // Let's assume caller handles logic or we let it return empty if it's just a non-zero exit that produces no output?
    // Actually, execSync throws on non-zero exit.
    // For grep: exit 1 = no matches. This is "success" for our counting purposes (count = 0).
    // For git: exit 1 = error.
    if (cmd.startsWith('grep') && error.status === 1) {
      return '';
    }

    // For other commands, rethrow or return error marker
    throw error;
  }
}

// --- Checks ---

function checkRepoHygiene(config) {
  const validPaths = config.paths.filter(p => fs.existsSync(p)).join(' ');

  if (!validPaths) {
      // If no paths exist, that's technically 0 untracked files in those paths
      return {
          name: 'Repo Hygiene (Untracked/Dirty)',
          passed: true,
          actual: 0,
          limit: config.maxUntrackedFiles,
          message: 'No configured paths exist to check'
      };
  }

  let output = '';
  try {
    // git status --porcelain returns exit code 0 even if there are changes.
    // It returns non-zero only on fatal errors.
    output = runCommand(`git status --porcelain ${validPaths}`);
  } catch (e) {
    return {
      name: 'Repo Hygiene (Untracked/Dirty)',
      passed: false,
      actual: -1,
      limit: config.maxUntrackedFiles,
      message: `Git command failed: ${e.message}`
    };
  }

  const lines = output ? output.split('\n') : [];
  const dirtyCount = lines.length;

  return {
    name: 'Repo Hygiene (Untracked/Dirty)',
    passed: dirtyCount <= config.maxUntrackedFiles,
    actual: dirtyCount,
    limit: config.maxUntrackedFiles,
    message: dirtyCount > config.maxUntrackedFiles ? `Found uncommitted/untracked changes:\n${output}` : undefined
  };
}

function checkDependencyCount(config) {
  const pkgPath = path.join(process.cwd(), config.packageJsonPath);
  if (!fs.existsSync(pkgPath)) {
    return { name: 'Dependency Count', passed: false, actual: 0, limit: config.maxDependencies, message: 'package.json missing' };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const count = Object.keys(pkg.dependencies || {}).length;

  return {
    name: 'Dependency Count',
    passed: count <= config.maxDependencies,
    actual: count,
    limit: config.maxDependencies
  };
}

function checkLintSuppressions(config) {
  let total = 0;
  for (const pattern of config.patterns) {
    // grep returns 1 if no matches, handled by runCommand
    const cmd = `grep -r "${pattern}" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage --exclude=pnpm-lock.yaml | wc -l`;
    try {
        const out = runCommand(cmd);
        const count = parseInt(out || '0', 10);
        total += count;
    } catch (e) {
        // If wc fails? Unlikely.
        console.error(`Error checking lint suppressions: ${e.message}`);
    }
  }

  return {
    name: 'Lint Suppressions',
    passed: total <= config.maxSuppressions,
    actual: total,
    limit: config.maxSuppressions
  };
}

function checkTechDebt(config) {
  const cmd = `grep -r "TODO" ${config.path} --exclude-dir=node_modules | wc -l`;
  let count = 0;
  try {
    const out = runCommand(cmd);
    count = parseInt(out || '0', 10);
  } catch (e) {
      if (e.message.includes("No such file")) {
          return { name: 'Tech Debt', passed: false, actual: 0, limit: config.maxTodos, message: `Path invalid: ${config.path}` };
      }
  }

  return {
    name: 'Tech Debt (TODOs)',
    passed: count <= config.maxTodos,
    actual: count,
    limit: config.maxTodos
  };
}

function checkTestSkips(config) {
  let total = 0;
  const validPaths = config.paths.filter(p => fs.existsSync(p)).join(' ');

  if (!validPaths) {
     return {
      name: 'Test Skips',
      passed: true,
      actual: 0,
      limit: config.maxSkips,
      message: 'No test paths found to check'
    };
  }

  const cmd = `grep -r "\\.skip" ${validPaths} | wc -l`;
  let count = 0;
  try {
      count = parseInt(runCommand(cmd) || '0', 10);
  } catch (e) {
      // ignore
  }
  total = count;

  return {
    name: 'Test Skips',
    passed: total <= config.maxSkips,
    actual: total,
    limit: config.maxSkips
  };
}

// --- Main ---

async function main() {
  const startTime = performance.now();
  const config = loadConfig();
  const results = [];

  console.log("💰 Checking GA Integrity Budgets...\n");

  results.push(checkRepoHygiene(config.repoHygiene));
  results.push(checkDependencyCount(config.dependencyCount));
  results.push(checkLintSuppressions(config.lintSuppression));
  results.push(checkTechDebt(config.techDebt));
  results.push(checkTestSkips(config.testSkips));

  // Verify Speed check
  const duration = performance.now() - startTime;
  results.push({
    name: 'Budget Check Duration',
    passed: duration <= config.verificationSpeed.maxDurationMs,
    actual: Math.round(duration),
    limit: config.verificationSpeed.maxDurationMs,
    message: `${Math.round(duration)}ms`
  });

  // Report
  let failures = 0;
  // Use simple formatting instead of console.table for consistency/safety
  console.log('--------------------------------------------------------------------------------');
  console.log('| Budget                         | Status  | Used | Limit | Message              |');
  console.log('--------------------------------------------------------------------------------');

  for (const r of results) {
      const statusIcon = r.passed ? '✅ PASS' : '❌ FAIL';
      // simple padding
      const name = r.name.padEnd(30).slice(0, 30);
      const status = statusIcon.padEnd(7); // "✅ PASS" is 7 chars? No, icons are wide.
      // Let's just tab separate or similar.
      // Actually standard console.log is fine.

      if (!r.passed) failures++;
  }

  // Re-print nicely
  console.table(results.map(r => ({
    Budget: r.name,
    Status: r.passed ? '✅ PASS' : '❌ FAIL',
    Used: r.actual,
    Limit: r.limit,
    Message: r.message ? r.message.replace(/\n/g, ' ') : '' // Flatten message for table
  })));

  if (failures > 0) {
    console.error(`\n❌ ${failures} budget(s) exceeded! See docs/ops/GA_INTEGRITY_BUDGETS.md`);

    // Print detailed messages for failures
    results.filter(r => !r.passed && r.message).forEach(r => {
        console.error(`\n[${r.name}] Failure Details:\n${r.message}`);
    });

    process.exit(1);
  } else {
    console.log(`\n🎉 All ${results.length} integrity budgets passed.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
