#!/usr/bin/env npx tsx
"use strict";
/**
 * Go-Live Evidence Bundle Verifier
 *
 * Validates an evidence bundle against the schema and verifies checksums.
 *
 * Usage:
 *   npx tsx scripts/evidence/verify-go-live-evidence.ts [path-to-evidence-dir]
 *   pnpm evidence:go-live:verify
 *
 * Arguments:
 *   path    Path to evidence directory (default: artifacts/evidence/go-live/<HEAD>)
 *
 * Exit codes:
 *   0       Verification passed
 *   1       Verification failed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
function loadSchema() {
    const schemaPath = node_path_1.default.join(process.cwd(), 'docs/evidence/schema/go_live_evidence.schema.json');
    if (!node_fs_1.default.existsSync(schemaPath)) {
        throw new Error(`Schema not found: ${schemaPath}`);
    }
    return JSON.parse(node_fs_1.default.readFileSync(schemaPath, 'utf8'));
}
function validateSchema(evidence, schema) {
    const ajv = new ajv_1.default({ strict: false, allErrors: true });
    (0, ajv_formats_1.default)(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(evidence);
    const errors = [];
    const warnings = [];
    if (!valid && validate.errors) {
        for (const error of validate.errors) {
            const path = error.instancePath || '(root)';
            errors.push(`${path}: ${error.message}`);
        }
    }
    return { valid: !!valid, errors, warnings };
}
function verifyChecksums(evidenceDir) {
    const checksumPath = node_path_1.default.join(evidenceDir, 'checksums.txt');
    const errors = [];
    const warnings = [];
    if (!node_fs_1.default.existsSync(checksumPath)) {
        return {
            valid: false,
            errors: ['checksums.txt not found'],
            warnings: [],
        };
    }
    const content = node_fs_1.default.readFileSync(checksumPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
        // Format: <hash>  <filename>
        const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
        if (!match) {
            warnings.push(`Invalid checksum line: ${line}`);
            continue;
        }
        const [, expectedHash, filename] = match;
        const filePath = node_path_1.default.join(evidenceDir, filename);
        if (!node_fs_1.default.existsSync(filePath)) {
            errors.push(`File not found: ${filename}`);
            continue;
        }
        const content = node_fs_1.default.readFileSync(filePath);
        const actualHash = node_crypto_1.default.createHash('sha256').update(content).digest('hex');
        if (actualHash !== expectedHash) {
            errors.push(`Checksum mismatch for ${filename}: expected ${expectedHash.substring(0, 16)}..., got ${actualHash.substring(0, 16)}...`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
function verifyRequiredFields(evidence) {
    const errors = [];
    const warnings = [];
    // Check git info
    const git = evidence.git;
    if (!git?.sha || typeof git.sha !== 'string' || git.sha.length !== 40) {
        errors.push('git.sha must be a 40-character hex string');
    }
    // Check checks exist and have valid statuses
    const checks = evidence.checks;
    if (checks) {
        for (const [name, check] of Object.entries(checks)) {
            const c = check;
            if (!['passed', 'failed', 'skipped'].includes(c.status)) {
                errors.push(`checks.${name}.status must be 'passed', 'failed', or 'skipped'`);
            }
        }
    }
    // Check summary consistency
    const summary = evidence.summary;
    if (summary && checks) {
        const checkResults = Object.values(checks);
        const actualPassed = checkResults.filter((c) => c.status === 'passed').length;
        const actualFailed = checkResults.filter((c) => c.status === 'failed').length;
        if (summary.passedChecks !== actualPassed) {
            warnings.push(`summary.passedChecks (${summary.passedChecks}) doesn't match actual (${actualPassed})`);
        }
        if (summary.failedChecks !== actualFailed) {
            warnings.push(`summary.failedChecks (${summary.failedChecks}) doesn't match actual (${actualFailed})`);
        }
    }
    // Warn if dirty
    if (git?.dirty === true) {
        warnings.push('Evidence was generated from a dirty working tree');
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
function getDefaultEvidenceDir() {
    // Get current git SHA
    const result = (0, node_child_process_1.spawnSync)('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    const sha = result.stdout?.trim() || 'unknown';
    return node_path_1.default.join('artifacts', 'evidence', 'go-live', sha);
}
function main() {
    console.log('========================================');
    console.log('  Go-Live Evidence Verifier');
    console.log('========================================\n');
    // Get evidence directory from args or default
    const evidenceDir = process.argv[2] || getDefaultEvidenceDir();
    console.log(`[verify] Evidence directory: ${evidenceDir}`);
    // Check directory exists
    if (!node_fs_1.default.existsSync(evidenceDir)) {
        console.error(`\n❌ Evidence directory not found: ${evidenceDir}`);
        console.error('   Run "pnpm evidence:go-live:gen" first to generate evidence.');
        process.exit(1);
    }
    // Load evidence.json
    const evidencePath = node_path_1.default.join(evidenceDir, 'evidence.json');
    if (!node_fs_1.default.existsSync(evidencePath)) {
        console.error(`\n❌ evidence.json not found in ${evidenceDir}`);
        process.exit(1);
    }
    let evidence;
    try {
        evidence = JSON.parse(node_fs_1.default.readFileSync(evidencePath, 'utf8'));
        console.log('[verify] Loaded evidence.json');
    }
    catch (error) {
        console.error(`\n❌ Failed to parse evidence.json: ${error}`);
        process.exit(1);
    }
    // Load and validate against schema
    console.log('[verify] Loading schema...');
    let schema;
    try {
        schema = loadSchema();
    }
    catch (error) {
        console.error(`\n❌ Failed to load schema: ${error}`);
        process.exit(1);
    }
    // Run validations
    const results = [];
    console.log('[verify] Validating against JSON schema...');
    const schemaResult = validateSchema(evidence, schema);
    results.push(schemaResult);
    if (schemaResult.valid) {
        console.log('  ✅ Schema validation passed');
    }
    else {
        console.log('  ❌ Schema validation failed:');
        for (const error of schemaResult.errors) {
            console.log(`     - ${error}`);
        }
    }
    console.log('[verify] Verifying checksums...');
    const checksumResult = verifyChecksums(evidenceDir);
    results.push(checksumResult);
    if (checksumResult.valid) {
        console.log('  ✅ Checksum verification passed');
    }
    else {
        console.log('  ❌ Checksum verification failed:');
        for (const error of checksumResult.errors) {
            console.log(`     - ${error}`);
        }
    }
    console.log('[verify] Verifying required fields...');
    const fieldsResult = verifyRequiredFields(evidence);
    results.push(fieldsResult);
    if (fieldsResult.valid) {
        console.log('  ✅ Required fields verification passed');
    }
    else {
        console.log('  ❌ Required fields verification failed:');
        for (const error of fieldsResult.errors) {
            console.log(`     - ${error}`);
        }
    }
    // Collect all warnings
    const allWarnings = results.flatMap((r) => r.warnings);
    if (allWarnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of allWarnings) {
            console.log(`   - ${warning}`);
        }
    }
    // Check evidence summary
    const summary = evidence.summary;
    const evidencePassed = summary?.passed === true;
    // Final result
    const allValid = results.every((r) => r.valid);
    console.log('\n========================================');
    if (allValid && evidencePassed) {
        console.log('  ✅ Evidence verification PASSED');
        console.log('  ✅ All go-live checks PASSED');
        console.log('========================================\n');
        process.exit(0);
    }
    else if (allValid && !evidencePassed) {
        console.log('  ✅ Evidence verification PASSED');
        console.log('  ❌ Go-live checks FAILED (see evidence.json)');
        console.log('========================================\n');
        process.exit(1);
    }
    else {
        console.log('  ❌ Evidence verification FAILED');
        console.log('========================================\n');
        process.exit(1);
    }
}
main();
