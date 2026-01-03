import { test } from 'node:test';
import assert from 'node:assert';
import { ProposalEngine, DenyRateRule, BurstRule } from '../engine.js';
import { SecurityEvidence } from '../proposal-types.js';

test('Policy Auto-Tuning Engine', async (t) => {
  const engine = new ProposalEngine();
  engine.registerRule(new DenyRateRule());
  engine.registerRule(new BurstRule());

  await t.test('DenyRateRule generates proposal for high denials', () => {
    const evidence: SecurityEvidence = {
      id: 'ev-1',
      type: 'deny_spike',
      timestamp: new Date().toISOString(),
      source: 'audit-log',
      data: {
        subject: { id: 'service-a' },
        action: 'write',
        resource: 'db-prod',
        count: 100,
        reason: 'Insufficient permissions'
      }
    };

    const proposal = engine.generateProposal(evidence);
    assert.ok(proposal, 'Should generate a proposal');
    assert.strictEqual(proposal?.rationale, 'High volume of denials (100) detected for service-a. Proposing explicit block to mitigate potential attack.');
    assert.strictEqual(proposal?.proposedChanges[0].target, 'policy/governance-config.yaml');
    assert.strictEqual(proposal?.proposedChanges[0].operation, 'add');
  });

  await t.test('BurstRule generates proposal for high RPS', () => {
    const evidence: SecurityEvidence = {
      id: 'ev-2',
      type: 'burst_behavior',
      timestamp: new Date().toISOString(),
      source: 'metrics',
      data: {
        tenantId: 'tenant-x',
        service: 'api',
        rps: 150
      }
    };

    const proposal = engine.generateProposal(evidence);
    assert.ok(proposal, 'Should generate a proposal');
    assert.strictEqual(proposal?.rationale, 'Tenant tenant-x exceeded burst thresholds (150 RPS). Proposing specific quota limit.');
    assert.strictEqual(proposal?.proposedChanges[0].target, 'policy/governance-config.yaml');
  });

  await t.test('Engine is deterministic', () => {
     const evidence: SecurityEvidence = {
      id: 'ev-fixed',
      type: 'deny_spike',
      timestamp: '2025-01-01T00:00:00Z',
      source: 'audit-log',
      data: {
        subject: { id: 'service-b' },
        action: 'read',
        resource: 'cache',
        count: 60,
        reason: 'Insufficient permissions'
      }
    };

    const p1 = engine.generateProposal(evidence);
    const p2 = engine.generateProposal(evidence);

    assert.strictEqual(p1?.id, p2?.id, 'IDs should be identical for identical inputs');
  });
});
