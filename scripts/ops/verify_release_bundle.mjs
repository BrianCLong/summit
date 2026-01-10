#!/usr/bin/env node

/**
 * scripts/ops/verify_release_bundle.mjs
 *
 * Verifies the existence and integrity of the MVP-4 Release Artifact Bundle.
 *
 * Usage:
 *   node scripts/ops/verify_release_bundle.mjs [--mode=hard|report]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

// Configuration
const BUNDLE_INDEX_PATH = 'docs/releases/MVP4_RELEASE_BUNDLE.md';
const FALLBACK_REQUIRED_FILES = [
  'docs/releases/MVP-4_GA_BASELINE.md',
  'docs/ga/MVP4-GA-MASTER-CHECKLIST.md',
  'docs/SUMMIT_READINESS_ASSERTION.md'
];

const GATE_CONFIG = {
  'scripts/ci/check_repo_hygiene.sh': { cmd: 'bash', args: [] },
  'scripts/ci/verify_evidence_map.mjs': { cmd: 'node', args: [] },
  'scripts/ci/verify_security_ledger.mjs': { cmd: 'node', args: ['--mode=hard'] },
  'scripts/ops/generate_trust_dashboard.mjs': { cmd: 'node', args: ['--mode=hard'] }
};

// Arguments
const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const MODE = modeArg ? modeArg.split('=')[1] : 'hard'; // 'hard' or 'report'

if (!['hard', 'report'].includes(MODE)) {
  console.error(`Invalid mode: ${MODE}. Use --mode=hard or --mode=report.`);
  process.exit(1);
}

// State
const results = {
  git: { status: 'PENDING', output: '' },
  files: [], // { path: string, exists: boolean }
  gates: [], // { path: string, status: 'PASS' | 'FAIL' | 'WARN' | 'MISSING', message: string }
};

// Helpers
function runCommand(command, cwd = REPO_ROOT) {
  try {
    return { success: true, output: execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (error) {
    return { success: false, output: error.stdout + error.stderr, code: error.status };
  }
}

function parseBundleIndex(filePath) {
  const absolutePath = path.join(REPO_ROOT, filePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');
  const referencedFiles = new Set();

  // Regex to capture markdown links: [Title](path) or just path in code blocks or lists
  // Simplified: look for anything that looks like a relative file path in the repo
  // We strictly look for strings starting with docs/ or scripts/ inside () or `` or just plain

  lines.forEach(line => {
    // Extract paths from markdown links [foo](bar)
    let match;
    const linkRegex = /\[.*?\]\((.*?)\)/g;
    while ((match = linkRegex.exec(line)) !== null) {
      const p = match[1].split('#')[0].trim(); // Remove anchors
      if ((p.startsWith('docs/') || p.startsWith('scripts/')) && !p.startsWith('http')) {
        referencedFiles.add(p);
      }
    }

    // Extract paths from code blocks `foo`
    const codeRegex = /`(.*?)`/g;
    while ((match = codeRegex.exec(line)) !== null) {
        const p = match[1].trim();
        if ((p.startsWith('docs/') || p.startsWith('scripts/')) && !p.startsWith('http')) {
            referencedFiles.add(p);
        }
    }
  });

  return Array.from(referencedFiles);
}

// Main Execution
console.log(`\n🔍 Verifying MVP-4 Release Bundle (Mode: ${MODE})\n`);

// 1. Git Hygiene Check
console.log('1️⃣  Checking Git Status...');
const porcelain = runCommand('git status --porcelain=v1');
const untracked = runCommand('git ls-files --others --exclude-standard');

if (porcelain.output.trim() === '' && untracked.output.trim() === '') {
  results.git.status = 'PASS';
  results.git.output = 'Working tree is clean.';
} else {
  results.git.status = 'FAIL';
  results.git.output = 'Working tree is dirty or has untracked files.\n' + porcelain.output + untracked.output;
}

// 2. Parse Bundle
console.log('2️⃣  Parsing Bundle Index...');
let requiredFiles = parseBundleIndex(BUNDLE_INDEX_PATH);
if (!requiredFiles) {
  console.warn(`⚠️  Bundle index ${BUNDLE_INDEX_PATH} not found. Using fallback list.`);
  requiredFiles = FALLBACK_REQUIRED_FILES;
  // If the bundle itself is missing, that's a file failure too if we consider it authoritative
  results.files.push({ path: BUNDLE_INDEX_PATH, exists: false });
} else {
    // Also check the bundle itself exists (implied)
    results.files.push({ path: BUNDLE_INDEX_PATH, exists: true });
}

// 3. Verify Files
console.log('3️⃣  Verifying File Existence...');
requiredFiles.forEach(fileRelPath => {
  const absPath = path.join(REPO_ROOT, fileRelPath);
  const exists = fs.existsSync(absPath);
  results.files.push({ path: fileRelPath, exists });
});

// 4. Run Gates
console.log('4️⃣  Running Release Gates...');

// We also check for gates listed in GATE_CONFIG that might NOT be in the parsed list,
// but the instructions say "Run hard gates (if present; otherwise WARN)".
// "If present" could mean "if present in the repo" or "if present in the bundle".
// The prompt says "Verify only what the bundle index references".
// But step 3 of the prompt lists specific gates to run.
// I will run the specific gates listed in the prompt IF they are in the parsed bundle OR if they exist.
// Actually, strict interpretation: "Verify all required files referenced in bundle exist." -> "Run hard gates (if present)".
// I will assume "if present" refers to file existence on disk for the specific hard gates listed in the prompt.

const HARD_GATES = [
  'scripts/ci/check_repo_hygiene.sh',
  'scripts/ci/verify_evidence_map.mjs',
  'scripts/ci/verify_security_ledger.mjs',
  'scripts/ops/generate_trust_dashboard.mjs'
];

HARD_GATES.forEach(gatePath => {
  const absPath = path.join(REPO_ROOT, gatePath);
  if (fs.existsSync(absPath)) {
    const config = GATE_CONFIG[gatePath] || { cmd: 'node', args: [] };
    const command = `${config.cmd} ${gatePath} ${config.args.join(' ')}`;
    console.log(`   Running: ${command}`);

    // Check if we should actually run it or just check existence?
    // "Run hard gates... Output a Markdown summary... Command failures summary"
    // So yes, run them.

    const runResult = runCommand(command, REPO_ROOT);
    if (runResult.success) {
      results.gates.push({ path: gatePath, status: 'PASS', message: 'Executed successfully' });
    } else {
      results.gates.push({ path: gatePath, status: 'FAIL', message: `Exit code ${runResult.code}` });
    }
  } else {
    // If it's referenced in the bundle, it's already failed the file existence check.
    // Here we just mark it as skipped/missing for the gate execution.
    // The prompt says: "If any verifier does not exist yet, the script must degrade gracefully (WARN)"
    results.gates.push({ path: gatePath, status: 'WARN', message: 'Verifier script missing' });
  }
});


// 5. Report
console.log('\n========================================');
console.log('           VERIFICATION REPORT          ');
console.log('========================================\n');

console.log('| Check | Item | Status | Message |');
console.log('|-------|------|--------|---------|');

// Git Report
console.log(`| GIT | Working Tree | ${results.git.status} | ${results.git.status === 'PASS' ? 'Clean' : 'Dirty/Untracked'} |`);

// Files Report
let missingFilesCount = 0;
results.files.forEach(f => {
    const status = f.exists ? 'PASS' : 'FAIL';
    if (!f.exists) missingFilesCount++;
    console.log(`| FILE | ${f.path} | ${status} | ${f.exists ? 'Found' : 'MISSING'} |`);
});

// Gates Report
let failedGatesCount = 0;
results.gates.forEach(g => {
    const isFail = g.status === 'FAIL';
    if (isFail) failedGatesCount++;
    console.log(`| GATE | ${g.path} | ${g.status} | ${g.message} |`);
});

console.log('\n--- Missing Files ---');
if (missingFilesCount === 0) console.log('None.');
else results.files.filter(f => !f.exists).forEach(f => console.log(`- ${f.path}`));

console.log('\n--- Gate Failures ---');
if (failedGatesCount === 0) console.log('None.');
else results.gates.filter(g => g.status === 'FAIL').forEach(g => console.log(`- ${g.path}: ${g.message}`));

console.log('\n--- Git Issues ---');
if (results.git.status === 'PASS') console.log('None.');
else console.log(results.git.output);


// Exit Code Determination
// Exit 0 only if all required checks pass and no required files missing.
// "WARN" on gates does NOT cause exit 1, per "fail only if it is required by the bundle index".
// Wait, if it IS required by the bundle index (which they are), then missing file = FAIL.
// But if the file is missing, it fails the "Files" check already.
// If the file exists but fails execution, that is a FAIL.

const hygieneFailed = results.git.status !== 'PASS';
const filesFailed = missingFilesCount > 0;
const gatesFailed = failedGatesCount > 0;

const success = !hygieneFailed && !filesFailed && !gatesFailed;

if (MODE === 'report') {
    console.log(`\n[REPORT MODE] Would exit with: ${success ? 0 : 1}`);
    process.exit(0);
} else {
    if (success) {
        console.log('\n✅ VERIFICATION SUCCESSFUL');
        process.exit(0);
    } else {
        console.error('\n❌ VERIFICATION FAILED');
        process.exit(1);
    }
}
