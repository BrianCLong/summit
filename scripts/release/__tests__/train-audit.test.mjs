import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildAuditReport,
  scanSoftGates,
  validateWorkflowYaml,
} from '../train_audit.mjs';

describe('Release Train Audit', () => {
  test('detects soft gates in workflows', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'train-audit-'));
    const workflowPath = path.join(tempDir, 'soft.yml');

    fs.writeFileSync(
      workflowPath,
      'jobs:\n  build:\n    continue-on-error: true\n  test:\n    if: ${{ inputs.skip }}\n'
    );

    const findings = scanSoftGates([workflowPath]);
    assert.equal(findings.length, 2);
  });

  test('flags invalid workflow yaml', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'train-audit-'));
    const workflowPath = path.join(tempDir, 'broken.yml');

    fs.writeFileSync(workflowPath, 'jobs: [');

    const errors = validateWorkflowYaml([workflowPath]);
    assert.equal(errors.length, 1);
  });

  test('buildAuditReport marks unsafe when drift detected', () => {
    const report = buildAuditReport({
      repo: 'acme/summit',
      branch: 'main',
      headSha: 'deadbeef',
      requiredChecks: ['Release Readiness Gate'],
      branchProtection: {
        accessible: false,
        requiredChecks: [],
      },
      requiredCheckStatus: {
        statuses: [
          { name: 'Release Readiness Gate', status: 'missing', conclusion: 'missing' },
        ],
        passing: false,
        failing: [
          { name: 'Release Readiness Gate', status: 'missing', conclusion: 'missing' },
        ],
      },
      softGates: [],
      workflowLintErrors: [],
      dependencyDiff: { total: 0, files: [] },
    });

    assert.equal(report.safe, false);
    assert.ok(report.reasons.length > 0);
  });
});
