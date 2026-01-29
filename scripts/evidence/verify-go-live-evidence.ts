#!/usr/bin/env npx tsx
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

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function loadSchema(): object {
  const schemaPath = path.join(
    process.cwd(),
    'docs/evidence/schema/go_live_evidence.schema.json'
  );

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaPath}`);
  }

  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function validateSchema(evidence: unknown, schema: object): VerificationResult {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(evidence);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!valid && validate.errors) {
    for (const error of validate.errors) {
      const path = error.instancePath || '(root)';
      errors.push(`${path}: ${error.message}`);
    }
  }

  return { valid: !!valid, errors, warnings };
}

function verifyChecksums(evidenceDir: string): VerificationResult {
  const checksumPath = path.join(evidenceDir, 'checksums.txt');
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(checksumPath)) {
    return {
      valid: false,
      errors: ['checksums.txt not found'],
      warnings: [],
    };
  }

  const content = fs.readFileSync(checksumPath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    // Format: <hash>  <filename>
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
    if (!match) {
      warnings.push(`Invalid checksum line: ${line}`);
      continue;
    }

    const [, expectedHash, filename] = match;
    const filePath = path.join(evidenceDir, filename);

    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${filename}`);
      continue;
    }

    const content = fs.readFileSync(filePath);
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');

    if (actualHash !== expectedHash) {
      errors.push(
        `Checksum mismatch for ${filename}: expected ${expectedHash.substring(0, 16)}..., got ${actualHash.substring(0, 16)}...`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function verifyRequiredFields(evidence: Record<string, unknown>): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check git info
  const git = evidence.git as Record<string, unknown> | undefined;
  if (!git?.sha || typeof git.sha !== 'string' || git.sha.length !== 40) {
    errors.push('git.sha must be a 40-character hex string');
  }

  // Check checks exist and have valid statuses
  const checks = evidence.checks as Record<string, unknown> | undefined;
  if (checks) {
    for (const [name, check] of Object.entries(checks)) {
      const c = check as Record<string, unknown>;
      if (!['passed', 'failed', 'skipped'].includes(c.status as string)) {
        errors.push(`checks.${name}.status must be 'passed', 'failed', or 'skipped'`);
      }
    }
  }

  // Check summary consistency
  const summary = evidence.summary as Record<string, unknown> | undefined;
  if (summary && checks) {
    const checkResults = Object.values(checks) as Array<{ status: string }>;
    const actualPassed = checkResults.filter((c) => c.status === 'passed').length;
    const actualFailed = checkResults.filter((c) => c.status === 'failed').length;

    if (summary.passedChecks !== actualPassed) {
      warnings.push(
        `summary.passedChecks (${summary.passedChecks}) doesn't match actual (${actualPassed})`
      );
    }
    if (summary.failedChecks !== actualFailed) {
      warnings.push(
        `summary.failedChecks (${summary.failedChecks}) doesn't match actual (${actualFailed})`
      );
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

function getDefaultEvidenceDir(): string {
  // Get current git SHA
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const sha = result.stdout?.trim() || 'unknown';

  return path.join('artifacts', 'evidence', 'go-live', sha);
}

function main(): void {
  console.log('========================================');
  console.log('  Go-Live Evidence Verifier');
  console.log('========================================\n');

  // Get evidence directory from args or default
  const evidenceDir = process.argv[2] || getDefaultEvidenceDir();
  console.log(`[verify] Evidence directory: ${evidenceDir}`);

  // Check directory exists
  if (!fs.existsSync(evidenceDir)) {
    console.error(`\n❌ Evidence directory not found: ${evidenceDir}`);
    console.error('   Run "pnpm evidence:go-live:gen" first to generate evidence.');
    process.exit(1);
  }

  // Load evidence.json
  const evidencePath = path.join(evidenceDir, 'evidence.json');
  if (!fs.existsSync(evidencePath)) {
    console.error(`\n❌ evidence.json not found in ${evidenceDir}`);
    process.exit(1);
  }

  let evidence: Record<string, unknown>;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    console.log('[verify] Loaded evidence.json');
  } catch (error) {
    console.error(`\n❌ Failed to parse evidence.json: ${error}`);
    process.exit(1);
  }

  // Load and validate against schema
  console.log('[verify] Loading schema...');
  let schema: object;
  try {
    schema = loadSchema();
  } catch (error) {
    console.error(`\n❌ Failed to load schema: ${error}`);
    process.exit(1);
  }

  // Run validations
  const results: VerificationResult[] = [];

  console.log('[verify] Validating against JSON schema...');
  const schemaResult = validateSchema(evidence, schema);
  results.push(schemaResult);
  if (schemaResult.valid) {
    console.log('  ✅ Schema validation passed');
  } else {
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
  } else {
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
  } else {
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
  const summary = evidence.summary as { passed?: boolean } | undefined;
  const evidencePassed = summary?.passed === true;

  // Final result
  const allValid = results.every((r) => r.valid);

  console.log('\n========================================');
  if (allValid && evidencePassed) {
    console.log('  ✅ Evidence verification PASSED');
    console.log('  ✅ All go-live checks PASSED');
    console.log('========================================\n');
    process.exit(0);
  } else if (allValid && !evidencePassed) {
    console.log('  ✅ Evidence verification PASSED');
    console.log('  ❌ Go-live checks FAILED (see evidence.json)');
    console.log('========================================\n');
    process.exit(1);
  } else {
    console.log('  ❌ Evidence verification FAILED');
    console.log('========================================\n');
    process.exit(1);
  }
}

main();
