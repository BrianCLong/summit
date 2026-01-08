import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const ARTIFACTS_DIR = 'artifacts/ga-evidence';
const DATE_STR = new Date().toISOString().split('T')[0];
const SHORT_SHA = getShortSha();
const BUNDLE_DIR = path.join(ARTIFACTS_DIR, DATE_STR, SHORT_SHA);

// --- Helpers ---

function getShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeEvidence(filename: string, content: string) {
  fs.writeFileSync(path.join(BUNDLE_DIR, filename), content);
}

function runStep(name: string, command: string, ignoreFailure = false): { success: boolean, output: string, duration: number } {
  console.log(`\n⏳ Running step: ${name}...`);
  const startTime = Date.now();

  try {
    // Run command, capturing both stdout and stderr
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} passed (${duration}ms)`);
    return { success: true, output: result, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const output = error.stdout?.toString() + '\n' + error.stderr?.toString();
    console.error(`❌ ${name} failed (${duration}ms)`);
    if (!ignoreFailure) {
      console.error(output);
    }
    return { success: false, output, duration };
  }
}

// --- Main Validator ---

async function main() {
  console.log(`🔒 Starting GA Release Validator`);
  console.log(`📂 Evidence Bundle: ${BUNDLE_DIR}`);

  ensureDir(BUNDLE_DIR);

  const summary: any = {
    timestamp: new Date().toISOString(),
    sha: SHORT_SHA,
    steps: {},
    env: {},
    status: 'pending'
  };

  let globalSuccess = true;

  // 1. Diagnostics
  const diagnostics = [
    { name: 'Node Version', cmd: 'node -v' },
    { name: 'PNPM Version', cmd: 'pnpm -v' },
    { name: 'Git Status', cmd: 'git status --porcelain' },
    { name: 'Environment', cmd: 'printenv' }, // Be careful with secrets, mostly for debug keys
  ];

  let diagOutput = '';
  for (const diag of diagnostics) {
    const res = runStep(diag.name, diag.cmd, true);
    diagOutput += `--- ${diag.name} ---\n${res.output}\n\n`;
    // We don't fail on diagnostics usually, unless specific checks fail
  }
  writeEvidence('diagnostics.log', diagOutput);

  // Capture Env Vars (Redacted)
  const safeEnv = { ...process.env };
  // Redact potential secrets
  for (const key in safeEnv) {
    if (key.match(/KEY|SECRET|TOKEN|PASS/i)) {
      safeEnv[key] = '[REDACTED]';
    }
  }
  summary.env = safeEnv;
  writeEvidence('environment.json', JSON.stringify(safeEnv, null, 2));


  // 2. Verification Steps
  // Using the canonical GA gate: pnpm ga:verify
  // We break it down if possible, or run it as one block.
  // 'pnpm ga:verify' runs: typecheck, lint, build, test:unit, ga:smoke

  const steps = [
    { id: 'typecheck', cmd: 'pnpm typecheck' },
    { id: 'lint', cmd: 'pnpm lint' },
    { id: 'build', cmd: 'pnpm build' },
    { id: 'unit_tests', cmd: 'pnpm --filter intelgraph-server test:unit' },
    // smoke tests are often flaky or require infra, but are part of ga:verify.
    // We run them as part of the gate.
    { id: 'smoke', cmd: 'pnpm ga:smoke' },
  ];

  for (const step of steps) {
    const result = runStep(step.id, step.cmd);
    summary.steps[step.id] = {
      success: result.success,
      duration: result.duration
    };
    writeEvidence(`${step.id}.log`, result.output);

    if (!result.success) {
      globalSuccess = false;
      console.error(`🚨 Critical Failure at step: ${step.id}`);
      break; // Fail fast
    }
  }

  // 3. Finalize
  summary.status = globalSuccess ? 'PASS' : 'FAIL';
  writeEvidence('summary.json', JSON.stringify(summary, null, 2));

  console.log(`\n----------------------------------------`);
  console.log(`🏁 Validation ${summary.status}`);
  console.log(`📄 Evidence: ${BUNDLE_DIR}`);
  console.log(`----------------------------------------`);

  if (!globalSuccess) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
