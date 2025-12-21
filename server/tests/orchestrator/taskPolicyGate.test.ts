// @ts-nocheck
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TaskPolicyGate } from '../../src/orchestrator/taskPolicyGate';
import { AgentTask } from '../../src/orchestrator/maestro';
import { opaClient } from '../../src/services/opa-client';

jest.mock('../../src/services/opa-client', () => ({
  opaClient: { evaluateQuery: jest.fn() },
}));

describe('TaskPolicyGate', () => {
  const auditPath = path.join(os.tmpdir(), 'task-policy-audit.log');

  beforeEach(() => {
    process.env.MAESTRO_POLICY_AUDIT_PATH = auditPath;
    if (fs.existsSync(auditPath)) {
      fs.unlinkSync(auditPath);
    }
  });

  it('records audit events when OPA denies a WRITE action', async () => {
    (opaClient.evaluateQuery as jest.Mock).mockResolvedValue({
      allow: false,
      reason: 'unsafe_parameters',
      policy_version: 'v1.0.0',
    });

    const gate = new TaskPolicyGate(opaClient as any);
    const task: AgentTask = {
      kind: 'implement',
      repo: 'audit-repo',
      issue: 'issue-1',
      budgetUSD: 5,
      context: { risk: 'high' },
      metadata: {
        actor: 'alice',
        timestamp: new Date().toISOString(),
        sprint_version: 's1',
      },
    };

    const decision = await gate.evaluate(task, 'WRITE');
    expect(decision.allowed).toBe(false);
    expect(decision.policyVersion).toBe('v1.0.0');

    const auditEntries = fs
      .readFileSync(auditPath, 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean);
    const lastEvent = JSON.parse(auditEntries[auditEntries.length - 1]);
    expect(lastEvent.allowed).toBe(false);
    expect(lastEvent.reason).toContain('unsafe_parameters');
    expect(lastEvent.policyVersion).toBe('v1.0.0');
  });
});
