#!/usr/bin/env npx tsx
"use strict";
/**
 * Go-Live Tag Creator
 *
 * Creates an immutable, annotated git tag for a verified go-live release.
 * Only creates tags for commits with passing evidence bundles.
 *
 * Usage:
 *   npx tsx scripts/release/create-go-live-tag.ts [evidence-dir]
 *   pnpm release:go-live:tag
 *
 * Options:
 *   --dry-run        Preview tag without creating it
 *   --force          Create tag even if checks failed (marks as pre-release)
 *   --push           Push tag to origin after creation
 *
 * Environment variables:
 *   EVIDENCE_DIR     Path to evidence directory
 *   VERSION          Release version (default: from package.json)
 *   DRY_RUN          Set to 1 for dry-run mode
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
function gitRun(args, dryRun = false) {
    if (dryRun) {
        console.log(`[dry-run] git ${args.join(' ')}`);
        return { success: true, output: '' };
    }
    const result = (0, node_child_process_1.spawnSync)('git', args, {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    return {
        success: result.status === 0,
        output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
    };
}
function tagExists(tagName) {
    const result = gitRun(['tag', '-l', tagName]);
    return result.output.includes(tagName);
}
function parseArgs() {
    const args = process.argv.slice(2);
    let dryRun = process.env.DRY_RUN === '1';
    let force = false;
    let push = false;
    let evidenceDir;
    for (const arg of args) {
        if (arg === '--dry-run')
            dryRun = true;
        else if (arg === '--force')
            force = true;
        else if (arg === '--push')
            push = true;
        else if (!arg.startsWith('--'))
            evidenceDir = arg;
    }
    return { dryRun, force, push, evidenceDir };
}
function main() {
    console.log('========================================');
    console.log('  Go-Live Tag Creator');
    console.log('========================================\n');
    const { dryRun, force, push, evidenceDir: argEvidenceDir } = parseArgs();
    if (dryRun) {
        console.log('[tag] Running in DRY-RUN mode\n');
    }
    // Get evidence directory
    const evidenceDir = argEvidenceDir || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
    console.log(`[tag] Evidence directory: ${evidenceDir}`);
    // Load evidence
    const evidencePath = node_path_1.default.join(evidenceDir, 'evidence.json');
    if (!node_fs_1.default.existsSync(evidencePath)) {
        console.error(`\n❌ Evidence not found: ${evidencePath}`);
        console.error('   Run "pnpm evidence:go-live:gen" first.');
        process.exit(1);
    }
    const evidence = JSON.parse(node_fs_1.default.readFileSync(evidencePath, 'utf8'));
    console.log(`[tag] Loaded evidence for commit ${evidence.git.sha}`);
    // Check if evidence passed
    if (!evidence.summary.passed && !force) {
        console.error('\n❌ Cannot create go-live tag: evidence checks failed');
        console.error('   Use --force to create a pre-release tag anyway.');
        process.exit(1);
    }
    if (evidence.git.dirty) {
        console.warn('\n⚠️  Warning: Evidence was generated from a dirty working tree');
    }
    // Get version and create tag name
    const version = process.env.VERSION || getPackageVersion();
    const tagName = evidence.summary.passed ? `v${version}` : `v${version}-prerelease`;
    console.log(`[tag] Tag name: ${tagName}`);
    // Check if tag already exists
    if (tagExists(tagName)) {
        console.error(`\n❌ Tag ${tagName} already exists`);
        console.error('   Increment version or delete existing tag first.');
        process.exit(1);
    }
    // Create tag message
    const tagMessage = `Go-Live Release ${version}

Evidence Summary:
- Commit: ${evidence.git.sha}
- Branch: ${evidence.git.branch}
- Checks: ${evidence.summary.passedChecks}/${evidence.summary.totalChecks} passed
- Status: ${evidence.summary.passed ? 'PASSED' : 'FAILED (pre-release)'}
- Generated: ${evidence.generatedAt}
${evidence.metadata?.runUrl ? `- CI Run: ${evidence.metadata.runUrl}` : ''}

Evidence Schema Version: ${evidence.version}
Evidence Bundle: ${evidenceDir}

This tag was created from a verified go-live evidence bundle.
`;
    // Create annotated tag
    console.log(`\n[tag] Creating annotated tag ${tagName} at ${evidence.git.sha}`);
    const tagResult = gitRun(['tag', '-a', tagName, evidence.git.sha, '-m', tagMessage], dryRun);
    if (!tagResult.success && !dryRun) {
        console.error(`\n❌ Failed to create tag: ${tagResult.output}`);
        process.exit(1);
    }
    console.log(`[tag] ✅ Tag ${tagName} created`);
    // Push if requested
    if (push) {
        console.log(`[tag] Pushing tag ${tagName} to origin...`);
        const pushResult = gitRun(['push', 'origin', tagName], dryRun);
        if (!pushResult.success && !dryRun) {
            console.error(`\n❌ Failed to push tag: ${pushResult.output}`);
            process.exit(1);
        }
        console.log(`[tag] ✅ Tag pushed to origin`);
    }
    // Summary
    console.log('\n========================================');
    console.log(`  ✅ Go-Live Tag Created: ${tagName}`);
    if (dryRun) {
        console.log('  (DRY-RUN - no changes made)');
    }
    console.log('========================================\n');
    // Print next steps
    console.log('Next steps:');
    if (!push && !dryRun) {
        console.log(`  1. Push the tag: git push origin ${tagName}`);
    }
    console.log(`  2. Create GitHub release from tag ${tagName}`);
    console.log('  3. Attach evidence bundle artifacts to release');
}
main();
