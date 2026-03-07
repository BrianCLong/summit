import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildApprovalGrant,
  buildApprovalRequest,
  emitDeterministicArtifacts,
  evaluateNonPublicPolicy,
  stableStringify,
  validateApprovalGrant,
  type NonPublicPolicy,
  type NonPublicRequest,
} from '../nonpublic';

const policy: NonPublicPolicy = {
  version: 'v1',
  rules: [
    {
      tool_name: 'SearchInternalIntel',
      source_id: 'jira-prod',
      scope: 'cases:read',
      purpose: 'incident-response',
      retention_days_max: 30,
      approval_required: true,
    },
  ],
};

const baseRequest: NonPublicRequest = {
  tool_name: 'SearchInternalIntel',
  source_id: 'jira-prod',
  scope: 'cases:read',
  purpose: 'incident-response',
  retention_days: 14,
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { force: true, recursive: true })));
  tempDirs.length = 0;
});

describe('non-public policy gating', () => {
  it('rejects unconfigured source with deny-by-default', () => {
    const decision = evaluateNonPublicPolicy(
      {
        ...baseRequest,
        source_id: 'splunk-prod',
      },
      policy,
    );

    expect(decision).toEqual({
      allow: false,
      reason: 'deny_by_default',
      denied_fields: ['source_id', 'scope', 'tool_name'],
    });
  });

  it('allows only when source, scope, purpose, retention and approval match', () => {
    const missingApproval = evaluateNonPublicPolicy(baseRequest, policy);
    expect(missingApproval.allow).toBe(false);
    expect(missingApproval.denied_fields).toContain('approval');

    const allowed = evaluateNonPublicPolicy(
      {
        ...baseRequest,
        approval_id: 'apr-001',
      },
      policy,
    );

    expect(allowed).toEqual({
      allow: true,
      reason: 'policy_match',
      matched_rule_id: 'jira-prod:cases:read',
    });
  });
});

describe('deterministic artifacts', () => {
  it('writes stable audit, provenance, and policy decision files', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'summit-nonpublic-'));
    tempDirs.push(tempRoot);

    await emitDeterministicArtifacts({
      artifacts_dir: tempRoot,
      run_id: 'run-001',
      policy_decision: {
        reason: 'policy_match',
        allow: true,
        matched_rule_id: 'jira-prod:cases:read',
      },
      audit: {
        tool_name: 'SearchInternalIntel',
        source_id: 'jira-prod',
        scope: 'cases:read',
        purpose: 'incident-response',
        retention_days: 14,
        decision: 'allow',
        reason: 'policy_match',
      },
      provenance: {
        source_id: 'jira-prod',
        tool_name: 'SearchInternalIntel',
        fields: [
          {
            field: 'summary',
            sensitivity: 'INTERNAL',
            provenance: 'jira.issue.summary',
          },
        ],
      },
    });

    const runDir = path.join(tempRoot, 'run-001');
    const policyDecision = await readFile(path.join(runDir, 'policy_decision.json'), 'utf8');
    const audit = await readFile(path.join(runDir, 'audit.json'), 'utf8');
    const provenance = await readFile(path.join(runDir, 'provenance.json'), 'utf8');

    const expectedPolicy = stableStringify({
      allow: true,
      matched_rule_id: 'jira-prod:cases:read',
      reason: 'policy_match',
    });
    expect(policyDecision).toBe(expectedPolicy);

    expect(audit.includes('"tool_name"')).toBe(true);
    expect(audit.includes('"retention_days"')).toBe(true);
    expect(audit.includes('"collected_at"')).toBe(false);
    expect(provenance.includes('"fields"')).toBe(true);
  });
});

describe('HITL approval protocol', () => {
  it('requires signed approval grant with matching nonce', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'summit-nonpublic-'));
    tempDirs.push(tempRoot);

    const request = buildApprovalRequest({
      ...baseRequest,
      approval_id: 'apr-004',
    });

    const validGrant = buildApprovalGrant(request, 'signing-secret');
    const isValid = validateApprovalGrant({
      approval_request: request,
      approval_grant: validGrant,
      signer_secret: 'signing-secret',
    });
    expect(isValid).toBe(true);

    const tamperedGrant = {
      ...validGrant,
      nonce: 'tampered',
    };
    const isTamperedValid = validateApprovalGrant({
      approval_request: request,
      approval_grant: tamperedGrant,
      signer_secret: 'signing-secret',
    });
    expect(isTamperedValid).toBe(false);

    await emitDeterministicArtifacts({
      artifacts_dir: tempRoot,
      run_id: 'run-approval',
      policy_decision: {
        allow: true,
        reason: 'policy_match',
      },
      audit: {
        tool_name: request.tool_name,
        source_id: request.source_id,
        scope: request.scope,
        purpose: request.purpose,
        retention_days: request.retention_days,
        decision: 'allow',
        reason: 'policy_match',
      },
      provenance: {
        source_id: request.source_id,
        tool_name: request.tool_name,
        fields: [
          {
            field: 'issue_id',
            sensitivity: 'INTERNAL',
            provenance: 'jira.issue.id',
          },
        ],
      },
      approval_request: request,
      approval_grant: validGrant,
    });

    const requestFile = await readFile(
      path.join(tempRoot, 'run-approval', 'approval_request.json'),
      'utf8',
    );
    const grantFile = await readFile(
      path.join(tempRoot, 'run-approval', 'approval_grant.json'),
      'utf8',
    );

    expect(requestFile.includes('"approval_id": "apr-004"')).toBe(true);
    expect(grantFile.includes(validGrant.signature)).toBe(true);
  });
});
