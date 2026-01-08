import { execSync, exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Configuration
const STEPS = [
  { name: 'Typecheck', command: 'pnpm typecheck' },
  { name: 'Lint', command: 'pnpm lint' },
  { name: 'Build', command: 'pnpm build' },
  { name: 'Unit Tests', command: 'pnpm --filter intelgraph-server test:unit' },
  { name: 'Smoke Tests', command: 'pnpm ga:smoke' }
];

const EVIDENCE_DIR = 'docs/releases/evidence';
const STRICT_MODE = process.env.GA_VERIFY_STRICT === 'true';

async function runCommand(step) {
  console.log(`\n▶ Running ${step.name}...`);
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(step.command);
    const duration = Date.now() - startTime;
    console.log(`✔ ${step.name} passed (${duration}ms)`);
    return {
      success: true,
      stdout,
      stderr,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`✘ ${step.name} failed (${duration}ms)`);
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      duration
    };
  }
}

async function getGitInfo() {
  try {
    const sha = execSync('git rev-parse HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return { sha, branch };
  } catch (e) {
    return { sha: 'unknown', branch: 'unknown' };
  }
}

async function generateEvidence(results, gitInfo) {
  const timestamp = new Date().toISOString();
  const dirPath = path.join(EVIDENCE_DIR, gitInfo.sha);

  // Ensure deterministic path (by SHA)
  if (fs.existsSync(dirPath)) {
    console.log(`\n⚠ Evidence directory already exists for ${gitInfo.sha}. Overwriting.`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });

  const manifest = {
    timestamp,
    git: gitInfo,
    environment: {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: os.totalmem()
    },
    results: results.map(r => ({
      step: r.step.name,
      success: r.success,
      duration: r.duration
    }))
  };

  // Write Manifest
  fs.writeFileSync(path.join(dirPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Write Logs
  let combinedLog = `GA VERIFY RUN - ${timestamp}\n`;
  combinedLog += `SHA: ${gitInfo.sha}\n`;
  combinedLog += `Branch: ${gitInfo.branch}\n`;
  combinedLog += `Strict Mode: ${STRICT_MODE}\n\n`;

  results.forEach(r => {
    combinedLog += `--- ${r.step.name} (${r.success ? 'PASS' : 'FAIL'}) ---\n`;
    combinedLog += `[STDOUT]\n${r.stdout}\n`;
    combinedLog += `[STDERR]\n${r.stderr}\n\n`;
  });

  fs.writeFileSync(path.join(dirPath, 'output.log'), combinedLog);

  // Write Index Markdown
  const indexContent = `# GA Verification Report
**SHA**: \`${gitInfo.sha}\`
**Date**: ${timestamp}
**Status**: ${results.every(r => r.success) ? '✅ PASS' : '❌ FAIL'}

## Summary
| Step | Status | Duration |
|------|--------|----------|
${results.map(r => `| ${r.step.name} | ${r.success ? '✅ Pass' : '❌ Fail'} | ${r.duration}ms |`).join('\n')}

## Artifacts
* [Manifest](./manifest.json)
* [Full Logs](./output.log)
`;
  fs.writeFileSync(path.join(dirPath, 'index.md'), indexContent);

  console.log(`\n📄 Evidence pack generated at: ${dirPath}`);
}

async function main() {
  console.log(`🚀 Starting GA Verification (Strict Mode: ${STRICT_MODE})`);

  const results = [];
  let allPassed = true;

  for (const step of STEPS) {
    const result = await runCommand(step);
    results.push({ step, ...result });
    if (!result.success) {
      allPassed = false;
      // In strict mode, we might want to fail fast, but for evidence we usually want full run?
      // "Failures block" usually implies fail fast OR fail at end.
      // Let's continue to run all steps to provide full diagnostics unless it's a build failure that blocks testing.
      // However, usually if build fails, tests fail.
      // Let's run all for better triage.
    }
  }

  const gitInfo = await getGitInfo();

  // Always generate evidence if at least we ran things, or maybe only on success?
  // User prompt: "Produce a deterministic evidence bundle on each successful run"
  // So only on success.
  if (allPassed) {
    await generateEvidence(results, gitInfo);
    console.log('\n✅ GA Verification PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ GA Verification FAILED');
    // If strict mode, exit 1. If not, warn but exit 0?
    // User: "failures block 'release intent' workflows, not arbitrary dev workflows"
    if (STRICT_MODE) {
        console.error('⛔ Strict mode enabled. Failing build.');
        process.exit(1);
    } else {
        console.warn('⚠ Strict mode disabled. Marking as success (Informational).');
        process.exit(0);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
