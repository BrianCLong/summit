#!/usr/bin/env npx tsx
"use strict";
/**
 * Go-Live GitHub Release Creator
 *
 * Creates a GitHub release from a verified evidence bundle.
 * Attaches all evidence artifacts and generates release notes.
 *
 * Usage:
 *   npx tsx scripts/release/create-go-live-release.ts [evidence-dir]
 *   pnpm release:go-live:github
 *
 * Options:
 *   --dry-run        Preview release without creating it
 *   --draft          Create as draft release
 *   --prerelease     Mark as pre-release
 *
 * Environment variables:
 *   EVIDENCE_DIR     Path to evidence directory
 *   GITHUB_TOKEN     GitHub token for API access (required)
 *   VERSION          Release version (default: from package.json)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
function getDefaultEvidenceDir() {
    const result = (0, node_child_process_1.spawnSync)('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    const sha = result.stdout?.trim() || 'unknown';
    return node_path_1.default.join('artifacts', 'evidence', 'go-live', sha);
}
function getPackageVersion() {
    try {
        const pkg = JSON.parse(node_fs_1.default.readFileSync('package.json', 'utf8'));
        return pkg.version || '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
function ghRun(args, dryRun = false) {
    if (dryRun) {
        console.log(`[dry-run] gh ${args.join(' ')}`);
        return { success: true, output: '' };
    }
    const result = (0, node_child_process_1.spawnSync)('gh', args, {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    return {
        success: result.status === 0,
        output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
    };
}
function checkGhCli() {
    const result = (0, node_child_process_1.spawnSync)('gh', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    return result.status === 0;
}
function checkGhAuth() {
    const result = (0, node_child_process_1.spawnSync)('gh', ['auth', 'status'], { encoding: 'utf8', stdio: 'pipe' });
    return result.status === 0;
}
function releaseExists(tagName) {
    const result = ghRun(['release', 'view', tagName]);
    return result.success;
}
function parseArgs() {
    const args = process.argv.slice(2);
    let dryRun = false;
    let draft = false;
    let prerelease = false;
    let evidenceDir;
    for (const arg of args) {
        if (arg === '--dry-run')
            dryRun = true;
        else if (arg === '--draft')
            draft = true;
        else if (arg === '--prerelease')
            prerelease = true;
        else if (!arg.startsWith('--'))
            evidenceDir = arg;
    }
    return { dryRun, draft, prerelease, evidenceDir };
}
function main() {
    console.log('========================================');
    console.log('  Go-Live GitHub Release Creator');
    console.log('========================================\n');
    const { dryRun, draft, prerelease: forcePrerelease, evidenceDir: argEvidenceDir } = parseArgs();
    if (dryRun) {
        console.log('[release] Running in DRY-RUN mode\n');
    }
    // Check gh CLI
    if (!checkGhCli()) {
        console.error('❌ GitHub CLI (gh) not found. Install from https://cli.github.com/');
        process.exit(1);
    }
    if (!dryRun && !checkGhAuth()) {
        console.error('❌ Not authenticated with GitHub CLI. Run: gh auth login');
        process.exit(1);
    }
    // Get evidence directory
    const evidenceDir = argEvidenceDir || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
    console.log(`[release] Evidence directory: ${evidenceDir}`);
    // Load evidence
    const evidencePath = node_path_1.default.join(evidenceDir, 'evidence.json');
    if (!node_fs_1.default.existsSync(evidencePath)) {
        console.error(`\n❌ Evidence not found: ${evidencePath}`);
        console.error('   Run "pnpm release:go-live:full" first.');
        process.exit(1);
    }
    const evidence = JSON.parse(node_fs_1.default.readFileSync(evidencePath, 'utf8'));
    console.log(`[release] Loaded evidence for commit ${evidence.git.sha}`);
    // Load release notes
    const releaseNotesPath = node_path_1.default.join(evidenceDir, 'release-notes.json');
    if (!node_fs_1.default.existsSync(releaseNotesPath)) {
        console.error(`\n❌ Release notes not found: ${releaseNotesPath}`);
        console.error('   Run "pnpm release:go-live:notes" first.');
        process.exit(1);
    }
    const releaseNotes = JSON.parse(node_fs_1.default.readFileSync(releaseNotesPath, 'utf8'));
    // Determine if pre-release
    const isPrerelease = forcePrerelease || !evidence.summary.passed;
    const tagName = isPrerelease ? `v${releaseNotes.version}-prerelease` : `v${releaseNotes.version}`;
    console.log(`[release] Tag: ${tagName}`);
    console.log(`[release] Pre-release: ${isPrerelease}`);
    console.log(`[release] Draft: ${draft}`);
    // Check if release already exists
    if (!dryRun && releaseExists(tagName)) {
        console.error(`\n❌ Release ${tagName} already exists`);
        console.error('   Delete existing release or increment version.');
        process.exit(1);
    }
    // Collect artifacts to upload
    const artifacts = [];
    const artifactFiles = [
        'evidence.json',
        'evidence.md',
        'checksums.txt',
        'sbom.cdx.json',
        'provenance.json',
        'RELEASE_NOTES.md',
    ];
    for (const file of artifactFiles) {
        const filePath = node_path_1.default.join(evidenceDir, file);
        if (node_fs_1.default.existsSync(filePath)) {
            artifacts.push(filePath);
        }
    }
    console.log(`[release] Artifacts to upload: ${artifacts.length}`);
    // Build gh release create command
    const ghArgs = ['release', 'create', tagName];
    // Add options
    ghArgs.push('--title', releaseNotes.title);
    ghArgs.push('--notes-file', node_path_1.default.join(evidenceDir, 'RELEASE_NOTES.md'));
    ghArgs.push('--target', evidence.git.sha);
    if (draft) {
        ghArgs.push('--draft');
    }
    if (isPrerelease) {
        ghArgs.push('--prerelease');
    }
    // Add artifacts
    for (const artifact of artifacts) {
        ghArgs.push(artifact);
    }
    // Create release
    console.log(`\n[release] Creating GitHub release ${tagName}...`);
    const result = ghRun(ghArgs, dryRun);
    if (!result.success && !dryRun) {
        console.error(`\n❌ Failed to create release: ${result.output}`);
        process.exit(1);
    }
    // Summary
    console.log('\n========================================');
    console.log(`  ✅ GitHub Release Created: ${tagName}`);
    if (dryRun) {
        console.log('  (DRY-RUN - no changes made)');
    }
    console.log('========================================\n');
    if (!dryRun && result.output) {
        console.log('Release URL:', result.output);
    }
    // Print next steps
    console.log('Next steps:');
    if (draft) {
        console.log('  1. Review the draft release on GitHub');
        console.log('  2. Publish when ready');
    }
    else {
        console.log('  1. Verify release artifacts on GitHub');
        console.log('  2. Announce release to stakeholders');
    }
}
main();
