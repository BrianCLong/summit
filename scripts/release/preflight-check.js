#!/usr/bin/env npx tsx
"use strict";
/**
 * Go-Live Pre-Flight Checklist
 *
 * Validates all prerequisites are met before creating a go-live release.
 * Checks tooling, authentication, git state, and existing artifacts.
 *
 * Usage:
 *   npx tsx scripts/release/preflight-check.ts
 *   pnpm release:go-live:preflight
 *
 * Options:
 *   --fix    Attempt to fix issues where possible
 *   --ci     Running in CI mode (skip interactive checks)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const results = [];
function run(cmd, args) {
    const result = (0, node_child_process_1.spawnSync)(cmd, args, { encoding: 'utf8', stdio: 'pipe' });
    return {
        success: result.status === 0,
        output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
    };
}
function check(name, condition, passMsg, failMsg, options) {
    results.push({
        name,
        status: condition ? 'pass' : options?.warn ? 'warn' : 'fail',
        message: condition ? passMsg : failMsg,
        fixable: options?.fixable,
        fixCommand: options?.fixCommand,
    });
}
function skip(name, message) {
    results.push({ name, status: 'skip', message });
}
// Parse arguments
const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const ciMode = args.includes('--ci') || process.env.CI === 'true';
console.log('========================================');
console.log('  Go-Live Pre-Flight Checklist');
console.log('========================================\n');
if (fixMode) {
    console.log('[preflight] Running in FIX mode\n');
}
// ============================================
// 1. Git State Checks
// ============================================
console.log('📋 Git State\n');
// Check git is available
const gitVersion = run('git', ['--version']);
check('Git installed', gitVersion.success, `Git ${gitVersion.output.replace('git version ', '')}`, 'Git not found');
// Check we're in a git repo
const gitRoot = run('git', ['rev-parse', '--show-toplevel']);
check('In git repository', gitRoot.success, 'Yes', 'Not a git repository');
// Check for uncommitted changes
const gitStatus = run('git', ['status', '--porcelain']);
const isDirty = gitStatus.output.length > 0;
check('Clean working tree', !isDirty, 'No uncommitted changes', `${gitStatus.output.split('\n').length} uncommitted changes`, { warn: true });
// Check branch
const gitBranch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const isMainBranch = ['main', 'master', 'release'].some((b) => gitBranch.output.includes(b));
check('On release branch', isMainBranch, `Branch: ${gitBranch.output}`, `Branch: ${gitBranch.output} (expected main/master/release)`, { warn: true });
// Check for unpushed commits
const gitUnpushed = run('git', ['log', '@{u}..', '--oneline']);
const hasUnpushed = gitUnpushed.output.length > 0;
check('No unpushed commits', !hasUnpushed, 'All commits pushed', `${gitUnpushed.output.split('\n').filter(Boolean).length} unpushed commits`, { warn: true });
// ============================================
// 2. Tooling Checks
// ============================================
console.log('\n📋 Tooling\n');
// Node.js
const nodeVersion = run('node', ['--version']);
const nodeOk = nodeVersion.success && parseInt(nodeVersion.output.replace('v', '')) >= 18;
check('Node.js >= 18', nodeOk, `Node ${nodeVersion.output}`, `Node ${nodeVersion.output || 'not found'} (requires >= 18)`, { fixable: true, fixCommand: 'nvm install 20' });
// pnpm
const pnpmVersion = run('pnpm', ['--version']);
check('pnpm installed', pnpmVersion.success, `pnpm ${pnpmVersion.output}`, 'pnpm not found', { fixable: true, fixCommand: 'npm install -g pnpm' });
// GitHub CLI
const ghVersion = run('gh', ['--version']);
check('GitHub CLI (gh)', ghVersion.success, `gh ${ghVersion.output.split('\n')[0]}`, 'GitHub CLI not found', { fixable: true, fixCommand: 'brew install gh' });
// GitHub CLI auth (skip in CI if using GITHUB_TOKEN)
if (!ciMode) {
    const ghAuth = run('gh', ['auth', 'status']);
    check('GitHub CLI authenticated', ghAuth.success, 'Authenticated', 'Not authenticated', { fixable: true, fixCommand: 'gh auth login' });
}
else {
    const hasToken = !!process.env.GITHUB_TOKEN;
    check('GitHub token available', hasToken, 'GITHUB_TOKEN set', 'GITHUB_TOKEN not set');
}
// ============================================
// 3. Project Checks
// ============================================
console.log('\n📋 Project Configuration\n');
// package.json exists
const pkgExists = node_fs_1.default.existsSync('package.json');
check('package.json exists', pkgExists, 'Found', 'Not found');
// Check version
if (pkgExists) {
    const pkg = JSON.parse(node_fs_1.default.readFileSync('package.json', 'utf8'));
    check('Version defined', !!pkg.version, `Version: ${pkg.version}`, 'No version in package.json');
    // Check required scripts
    const requiredScripts = [
        'evidence:go-live:gen',
        'evidence:go-live:verify',
        'release:go-live:full',
    ];
    for (const script of requiredScripts) {
        check(`Script: ${script}`, !!pkg.scripts?.[script], 'Defined', 'Missing');
    }
}
// Check schema exists
const schemaPath = 'docs/evidence/schema/go_live_evidence.schema.json';
check('Evidence schema exists', node_fs_1.default.existsSync(schemaPath), 'Found', 'Not found');
// Check smoke script
const smokePath = 'scripts/go-live/smoke-prod.sh';
const smokeExists = node_fs_1.default.existsSync(smokePath);
check('Smoke test script exists', smokeExists, 'Found', 'Not found');
if (smokeExists) {
    const smokeStats = node_fs_1.default.statSync(smokePath);
    const isExecutable = (smokeStats.mode & 0o111) !== 0;
    check('Smoke script executable', isExecutable, 'Yes', 'No', { fixable: true, fixCommand: `chmod +x ${smokePath}` });
}
// ============================================
// 4. Dependencies Check
// ============================================
console.log('\n📋 Dependencies\n');
// node_modules exists
const nmExists = node_fs_1.default.existsSync('node_modules');
check('Dependencies installed', nmExists, 'node_modules exists', 'Run pnpm install', { fixable: true, fixCommand: 'pnpm install' });
// pnpm-lock.yaml exists
const lockExists = node_fs_1.default.existsSync('pnpm-lock.yaml');
check('Lock file exists', lockExists, 'pnpm-lock.yaml found', 'No lock file');
// ============================================
// 5. Previous Evidence Check
// ============================================
console.log('\n📋 Previous Releases\n');
// Check for existing evidence
const sha = run('git', ['rev-parse', 'HEAD']).output;
const evidencePath = node_path_1.default.join('artifacts', 'evidence', 'go-live', sha);
const evidenceExists = node_fs_1.default.existsSync(node_path_1.default.join(evidencePath, 'evidence.json'));
if (evidenceExists) {
    const evidence = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(evidencePath, 'evidence.json'), 'utf8'));
    check('Evidence for current commit', true, `Found (passed: ${evidence.summary?.passed})`, '');
}
else {
    skip('Evidence for current commit', 'Not generated yet');
}
// Check for existing tag
const pkg = pkgExists ? JSON.parse(node_fs_1.default.readFileSync('package.json', 'utf8')) : {};
const tagName = `v${pkg.version || '0.0.0'}`;
const tagExists = run('git', ['tag', '-l', tagName]);
check(`Tag ${tagName} available`, !tagExists.output.includes(tagName), 'Tag not used', 'Tag already exists', { warn: true });
// ============================================
// Summary
// ============================================
console.log('\n========================================');
console.log('  Summary');
console.log('========================================\n');
const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.filter((r) => r.status === 'fail').length;
const warned = results.filter((r) => r.status === 'warn').length;
const skipped = results.filter((r) => r.status === 'skip').length;
for (const result of results) {
    const icon = result.status === 'pass'
        ? '✅'
        : result.status === 'fail'
            ? '❌'
            : result.status === 'warn'
                ? '⚠️'
                : '⏭️';
    console.log(`${icon} ${result.name}: ${result.message}`);
}
console.log(`
Total: ${results.length} checks
  ✅ Passed:  ${passed}
  ❌ Failed:  ${failed}
  ⚠️  Warnings: ${warned}
  ⏭️  Skipped: ${skipped}
`);
// Fix mode
if (fixMode && failed > 0) {
    const fixable = results.filter((r) => r.status === 'fail' && r.fixable);
    if (fixable.length > 0) {
        console.log('Attempting to fix issues...\n');
        for (const fix of fixable) {
            if (fix.fixCommand) {
                console.log(`Running: ${fix.fixCommand}`);
                const result = (0, node_child_process_1.spawnSync)('sh', ['-c', fix.fixCommand], {
                    stdio: 'inherit',
                });
                if (result.status === 0) {
                    console.log(`✅ Fixed: ${fix.name}\n`);
                }
                else {
                    console.log(`❌ Failed to fix: ${fix.name}\n`);
                }
            }
        }
    }
}
// Exit code
if (failed > 0) {
    console.log('❌ Pre-flight check FAILED. Fix issues before release.\n');
    process.exit(1);
}
else if (warned > 0) {
    console.log('⚠️  Pre-flight check passed with WARNINGS.\n');
    process.exit(0);
}
else {
    console.log('✅ Pre-flight check PASSED. Ready for release!\n');
    process.exit(0);
}
