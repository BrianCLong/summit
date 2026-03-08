#!/usr/bin/env npx tsx
"use strict";
/**
 * verify-go-live-evidence.ts
 *
 * Verifies go-live evidence bundle integrity and completeness.
 * This is a gate that must pass before release notes can be generated.
 *
 * Usage:
 *   pnpm evidence:go-live:verify
 *   npx tsx scripts/release/verify-go-live-evidence.ts [--sha <sha>]
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const CONFIG = {
    evidenceBaseDir: 'artifacts/evidence/go-live',
    evidenceFile: 'evidence.json',
};
/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let sha = '';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--sha' && args[i + 1]) {
            sha = args[++i];
        }
        else if (args[i] === '--help' || args[i] === '-h') {
            console.log(`
Go-Live Evidence Verifier

Usage:
  pnpm evidence:go-live:verify
  npx tsx scripts/release/verify-go-live-evidence.ts [options]

Options:
  --sha <sha>     Use specific commit SHA (default: current HEAD)
  --help, -h      Show this help
      `);
            process.exit(0);
        }
    }
    if (!sha) {
        sha = (0, node_child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    }
    return { sha };
}
/**
 * Verify evidence exists
 */
function verifyExists(sha) {
    const evidencePath = (0, node_path_1.join)(CONFIG.evidenceBaseDir, sha, CONFIG.evidenceFile);
    return {
        valid: (0, node_fs_1.existsSync)(evidencePath),
        path: evidencePath,
    };
}
/**
 * Verify evidence schema
 */
function verifySchema(evidence) {
    const errors = [];
    // Required top-level fields
    const requiredFields = ['version', 'sha', 'timestamp', 'branch', 'checks'];
    for (const field of requiredFields) {
        if (!(field in evidence)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    // Version check
    if (evidence.version && evidence.version !== '1.0.0') {
        errors.push(`Unsupported evidence version: ${evidence.version}`);
    }
    // Timestamp validation (ISO 8601)
    if (evidence.timestamp) {
        const date = new Date(evidence.timestamp);
        if (isNaN(date.getTime())) {
            errors.push(`Invalid timestamp format: ${evidence.timestamp}`);
        }
    }
    // Checks structure
    if (evidence.checks) {
        const requiredChecks = ['lint', 'build', 'tests'];
        for (const check of requiredChecks) {
            if (!(check in evidence.checks)) {
                errors.push(`Missing required check: ${check}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Verify evidence integrity (SHA match)
 */
function verifyIntegrity(evidence, expectedSha) {
    if (evidence.sha !== expectedSha) {
        return {
            valid: false,
            error: `SHA mismatch: evidence=${evidence.sha}, expected=${expectedSha}`,
        };
    }
    return { valid: true };
}
/**
 * Verify no critical failures
 */
function verifyCriticalChecks(evidence) {
    const failures = [];
    // These checks are critical and must not fail
    const criticalChecks = ['lint', 'build'];
    for (const checkName of criticalChecks) {
        const check = evidence.checks[checkName];
        if (check && check.status === 'fail') {
            failures.push(`Critical check failed: ${checkName}`);
        }
    }
    return {
        valid: failures.length === 0,
        failures,
    };
}
/**
 * Main execution
 */
async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  GO-LIVE EVIDENCE VERIFIER');
    console.log('═══════════════════════════════════════════');
    console.log('');
    const { sha } = parseArgs();
    console.log(`Verifying evidence for SHA: ${sha}`);
    console.log('');
    let allValid = true;
    // Step 1: Check existence
    console.log('📋 Checking evidence exists...');
    const existsCheck = verifyExists(sha);
    if (!existsCheck.valid) {
        console.log(`   ❌ Evidence file not found: ${existsCheck.path}`);
        console.log('');
        console.log('To generate evidence, run:');
        console.log('  pnpm evidence:go-live:generate');
        console.log('');
        process.exit(1);
    }
    console.log(`   ✓ Evidence file found: ${existsCheck.path}`);
    // Load evidence
    const evidence = JSON.parse((0, node_fs_1.readFileSync)(existsCheck.path, 'utf8'));
    // Step 2: Verify schema
    console.log('');
    console.log('📋 Verifying evidence schema...');
    const schemaCheck = verifySchema(evidence);
    if (!schemaCheck.valid) {
        for (const error of schemaCheck.errors) {
            console.log(`   ❌ ${error}`);
        }
        allValid = false;
    }
    else {
        console.log('   ✓ Schema valid');
    }
    // Step 3: Verify integrity
    console.log('');
    console.log('📋 Verifying evidence integrity...');
    const integrityCheck = verifyIntegrity(evidence, sha);
    if (!integrityCheck.valid) {
        console.log(`   ❌ ${integrityCheck.error}`);
        allValid = false;
    }
    else {
        console.log('   ✓ SHA matches');
    }
    // Step 4: Verify critical checks
    console.log('');
    console.log('📋 Verifying critical checks...');
    const criticalCheck = verifyCriticalChecks(evidence);
    if (!criticalCheck.valid) {
        for (const failure of criticalCheck.failures) {
            console.log(`   ❌ ${failure}`);
        }
        allValid = false;
    }
    else {
        console.log('   ✓ No critical failures');
    }
    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════');
    if (allValid) {
        console.log('  ✓ EVIDENCE VERIFIED');
    }
    else {
        console.log('  ❌ VERIFICATION FAILED');
    }
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Evidence Summary:');
    console.log(`  SHA:       ${evidence.sha}`);
    console.log(`  Branch:    ${evidence.branch}`);
    console.log(`  Timestamp: ${evidence.timestamp}`);
    console.log(`  Warnings:  ${evidence.warnings?.length || 0}`);
    console.log(`  Exceptions: ${evidence.exceptions?.length || 0}`);
    console.log('');
    console.log('Check Results:');
    for (const [name, check] of Object.entries(evidence.checks || {})) {
        const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⏭';
        console.log(`  ${icon} ${name}: ${check.status}`);
    }
    console.log('');
    if (!allValid) {
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
