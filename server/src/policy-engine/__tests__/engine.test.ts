import { describe, it, expect } from '@jest/globals';
import { ProposalEngine, DenyRateRule, BurstRule } from '../engine.js';
import { SecurityEvidence } from '../proposal-types.js';

describe('Policy Auto-Tuning Engine', () => {
  const engine = new ProposalEngine();
  engine.registerRule(new DenyRateRule());
  engine.registerRule(new BurstRule());

  it('DenyRateRule generates proposal for high denials', () => {
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
    expect(proposal).toBeTruthy();
    expect(proposal?.rationale).toBe(
      'High volume of denials (100) detected for service-a. Proposing explicit block to mitigate potential attack.',
    );
    expect(proposal?.proposedChanges[0].target).toBe(
      'policy/governance-config.yaml',
    );
    expect(proposal?.proposedChanges[0].operation).toBe('add');
  });

  it('BurstRule generates proposal for high RPS', () => {
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
    expect(proposal).toBeTruthy();
    expect(proposal?.rationale).toBe(
      'Tenant tenant-x exceeded burst thresholds (150 RPS). Proposing specific quota limit.',
    );
    expect(proposal?.proposedChanges[0].target).toBe(
      'policy/governance-config.yaml',
    );
  });

  it('Engine is deterministic', () => {
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

    expect(p1?.id).toBe(p2?.id);
  });
});
