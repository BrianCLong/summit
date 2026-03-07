import test from 'node:test';
import assert from 'node:assert';
import { canPromote, ProposedChange, ApprovalSet, EvidenceBundle } from '../../summit/security/promotion_gate.js';

test('canPromote returns true for valid setup', () => {
  const change: ProposedChange = { id: '1', selfModifying: false, description: 'Safe config update' };
  const approvals: ApprovalSet = { humanApprovers: ['admin1'] };
  const evidence: EvidenceBundle = { reportValid: true, metricsValid: true, stampValid: true };

  assert.strictEqual(canPromote(change, approvals, evidence), true);
});

test('canPromote returns false if self-modifying', () => {
  const change: ProposedChange = { id: '1', selfModifying: true, description: 'Safe config update' };
  const approvals: ApprovalSet = { humanApprovers: ['admin1'] };
  const evidence: EvidenceBundle = { reportValid: true, metricsValid: true, stampValid: true };

  assert.strictEqual(canPromote(change, approvals, evidence), false);
});

test('canPromote returns false if no human approvers', () => {
  const change: ProposedChange = { id: '1', selfModifying: false, description: 'Safe config update' };
  const approvals: ApprovalSet = { humanApprovers: [] };
  const evidence: EvidenceBundle = { reportValid: true, metricsValid: true, stampValid: true };

  assert.strictEqual(canPromote(change, approvals, evidence), false);
});

test('canPromote returns false if evidence invalid', () => {
  const change: ProposedChange = { id: '1', selfModifying: false, description: 'Safe config update' };
  const approvals: ApprovalSet = { humanApprovers: ['admin1'] };
  const evidence: EvidenceBundle = { reportValid: true, metricsValid: false, stampValid: true };

  assert.strictEqual(canPromote(change, approvals, evidence), false);
});
