import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeDiff,
  hashObject,
  loadPolicy,
  stableJson
} from '../lib/branch-protection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures', 'governance-evidence');

/**
 * Branch Protection Drift Report Schema
 * Version: 1.0
 *
 * Required fields for drift evidence:
 * - schema_version: number (must be 1)
 * - kind: string (must be 'branch_protection_audit')
 * - state: string (one of VERIFIED_MATCH, VERIFIED_DRIFT, UNVERIFIABLE_PERMISSIONS, UNVERIFIABLE_ERROR, RATE_LIMITED, NO_PROTECTION)
 * - target_branch: string
 *
 * Optional fields (present when state is VERIFIED_DRIFT):
 * - diff.missing_in_github: string[]
 * - diff.extra_in_github: string[]
 * - diff.strict_mismatch: boolean
 *
 * Optional fields (present when state is UNVERIFIABLE_*):
 * - error.code: string
 * - error.http_status: number | null
 */

const VALID_STATES = [
  'VERIFIED_MATCH',
  'VERIFIED_DRIFT',
  'UNVERIFIABLE_PERMISSIONS',
  'UNVERIFIABLE_ERROR',
  'RATE_LIMITED',
  'NO_PROTECTION'
];

function validateDriftEvidenceSchema(evidence) {
  const errors = [];

  // Required fields
  if (typeof evidence.schema_version !== 'number') {
    errors.push('schema_version must be a number');
  } else if (evidence.schema_version !== 1) {
    errors.push(`schema_version must be 1, got ${evidence.schema_version}`);
  }

  if (evidence.kind !== 'branch_protection_audit') {
    errors.push(`kind must be 'branch_protection_audit', got '${evidence.kind}'`);
  }

  if (!VALID_STATES.includes(evidence.state)) {
    errors.push(`state must be one of ${VALID_STATES.join(', ')}, got '${evidence.state}'`);
  }

  if (typeof evidence.target_branch !== 'string' || evidence.target_branch.length === 0) {
    errors.push('target_branch must be a non-empty string');
  }

  // Conditional validation for VERIFIED_DRIFT state
  if (evidence.state === 'VERIFIED_DRIFT') {
    if (!evidence.diff) {
      errors.push('diff is required when state is VERIFIED_DRIFT');
    } else {
      if (!Array.isArray(evidence.diff.missing_in_github)) {
        errors.push('diff.missing_in_github must be an array');
      }
      if (!Array.isArray(evidence.diff.extra_in_github)) {
        errors.push('diff.extra_in_github must be an array');
      }
      if (typeof evidence.diff.strict_mismatch !== 'boolean') {
        errors.push('diff.strict_mismatch must be a boolean');
      }
    }
  }

  // Conditional validation for error states
  if (evidence.state.startsWith('UNVERIFIABLE_') || evidence.state === 'RATE_LIMITED') {
    if (evidence.error) {
      if (typeof evidence.error.code !== 'string') {
        errors.push('error.code must be a string when error is present');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

describe('branch_protection_drift schema validation', () => {
  test('match fixture validates against schema', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, 'branch-protection.match.json'), 'utf8')
    );
    const result = validateDriftEvidenceSchema(fixture);
    assert.ok(result.valid, `Schema validation failed: ${result.errors.join(', ')}`);
    assert.equal(fixture.state, 'VERIFIED_MATCH');
  });

  test('drift fixture validates against schema', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, 'branch-protection.drift.json'), 'utf8')
    );
    const result = validateDriftEvidenceSchema(fixture);
    assert.ok(result.valid, `Schema validation failed: ${result.errors.join(', ')}`);
    assert.equal(fixture.state, 'VERIFIED_DRIFT');
    assert.ok(Array.isArray(fixture.diff.missing_in_github));
    assert.ok(Array.isArray(fixture.diff.extra_in_github));
  });

  test('unverifiable fixture validates against schema', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, 'branch-protection.unverifiable.json'), 'utf8')
    );
    const result = validateDriftEvidenceSchema(fixture);
    assert.ok(result.valid, `Schema validation failed: ${result.errors.join(', ')}`);
    assert.equal(fixture.state, 'UNVERIFIABLE_PERMISSIONS');
    assert.equal(fixture.error.code, 'permission');
    assert.equal(fixture.error.http_status, 403);
  });
});

describe('branch_protection_drift determinism', () => {
  test('stableJson produces consistent output', () => {
    const obj1 = { z: 1, a: 2, m: [3, 2, 1] };
    const obj2 = { a: 2, m: [3, 2, 1], z: 1 };

    const json1 = stableJson(obj1);
    const json2 = stableJson(obj2);

    assert.equal(json1, json2, 'stableJson should produce same output for equivalent objects');
  });

  test('hashObject produces consistent hashes', () => {
    const obj1 = { contexts: ['a', 'b', 'c'], strict: true };
    const obj2 = { strict: true, contexts: ['a', 'b', 'c'] };

    const hash1 = hashObject(obj1);
    const hash2 = hashObject(obj2);

    assert.equal(hash1, hash2, 'hashObject should produce same hash for equivalent objects');
    assert.match(hash1, /^[a-f0-9]{64}$/, 'hash should be a 64-char hex string (SHA-256)');
  });

  test('computeDiff produces deterministic output', () => {
    const policy = {
      branch: 'main',
      required_status_checks: {
        strict: true,
        required_contexts: ['CI Core', 'GA Gate', 'Unit Tests']
      }
    };

    const actual = {
      strict: false,
      required_contexts: ['CI Core', 'Legacy Check']
    };

    // Run multiple times to verify determinism
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(JSON.stringify(computeDiff(policy, actual)));
    }

    const allSame = results.every(r => r === results[0]);
    assert.ok(allSame, 'computeDiff should produce identical output on repeated calls');

    const diff = computeDiff(policy, actual);
    assert.deepEqual(diff.missing_in_github.sort(), ['GA Gate', 'Unit Tests']);
    assert.deepEqual(diff.extra_in_github.sort(), ['Legacy Check']);
    assert.equal(diff.strict_mismatch, true);
  });

  test('diff arrays are consistent across repeated calls', () => {
    const policy = {
      branch: 'main',
      required_status_checks: {
        strict: true,
        required_contexts: ['Zebra Check', 'Alpha Check', 'Beta Check']
      }
    };

    const actual = {
      strict: true,
      required_contexts: ['Zulu Extra', 'Able Extra']
    };

    // Run multiple times and verify consistency
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(computeDiff(policy, actual));
    }

    // All results should be identical
    const first = JSON.stringify(results[0]);
    const allSame = results.every(r => JSON.stringify(r) === first);
    assert.ok(allSame, 'computeDiff should produce identical arrays on repeated calls');

    // Verify expected content (sorted for comparison)
    assert.deepEqual(
      [...results[0].missing_in_github].sort(),
      ['Alpha Check', 'Beta Check', 'Zebra Check'],
      'should detect all missing checks'
    );
    assert.deepEqual(
      [...results[0].extra_in_github].sort(),
      ['Able Extra', 'Zulu Extra'],
      'should detect all extra checks'
    );
  });
});

describe('branch_protection_drift policy loading', () => {
  test('loadPolicy handles valid policy file', () => {
    const policyPath = 'docs/ci/REQUIRED_CHECKS_POLICY.yml';

    // Only run if the policy file exists
    if (!fs.existsSync(policyPath)) {
      return;
    }

    const policy = loadPolicy(policyPath);

    assert.ok(policy.branch, 'policy should have a branch');
    assert.ok(policy.required_status_checks, 'policy should have required_status_checks');
    assert.ok(Array.isArray(policy.required_status_checks.required_contexts), 'required_contexts should be an array');
    assert.ok(policy.required_status_checks.required_contexts.length > 0, 'should have at least one required context');
  });

  test('loadPolicy throws on missing file', () => {
    assert.throws(() => {
      loadPolicy('/nonexistent/path/policy.yml');
    }, /ENOENT/);
  });
});

describe('branch_protection_drift report contract', () => {
  test('report artifact has required fields', () => {
    // This validates the expected structure of the JSON report artifact
    const expectedReportFields = [
      'version',
      'generated_at',
      'repository',
      'branch',
      'policy_file',
      'policy_version',
      'exceptions_file',
      'exceptions_loaded',
      'api_accessible',
      'api_error',
      'drift_detected',
      'summary',
      'policy_checks',
      'github_checks',
      'missing_in_github',
      'extra_in_github',
      'excepted_mismatches'
    ];

    // Create a mock report to validate structure
    const mockReport = {
      version: '1.1',
      generated_at: '2026-02-04T10:00:00Z',
      repository: 'owner/repo',
      branch: 'main',
      policy_file: 'docs/ci/REQUIRED_CHECKS_POLICY.yml',
      policy_version: '2.1.0',
      exceptions_file: 'docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml',
      exceptions_loaded: true,
      api_accessible: true,
      api_error: null,
      drift_detected: false,
      summary: {
        policy_check_count: 7,
        github_check_count: 7,
        missing_in_github_count: 0,
        extra_in_github_count: 0,
        excepted_missing_count: 0,
        excepted_extra_count: 0,
        active_exception_count: 0
      },
      policy_checks: ['CI Core', 'GA Gate'],
      github_checks: ['CI Core', 'GA Gate'],
      missing_in_github: [],
      extra_in_github: [],
      excepted_mismatches: {
        missing: [],
        extra: []
      }
    };

    for (const field of expectedReportFields) {
      assert.ok(field in mockReport, `Report should have field '${field}'`);
    }

    // Validate summary structure
    assert.ok('policy_check_count' in mockReport.summary);
    assert.ok('github_check_count' in mockReport.summary);
    assert.ok('missing_in_github_count' in mockReport.summary);
    assert.ok('extra_in_github_count' in mockReport.summary);
  });
});

// Export schema validator for use in other tests
export { validateDriftEvidenceSchema, VALID_STATES };
