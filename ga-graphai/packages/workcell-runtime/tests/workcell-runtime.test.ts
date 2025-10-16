import { describe, expect, it } from 'vitest';
import { PolicyEngine } from 'policy';
import { ProvenanceLedger } from 'prov-ledger';
import {
  WorkcellRuntime,
  type WorkOrderSubmission,
  type WorkcellAgentDefinition,
  type WorkcellToolDefinition,
} from '../src/index';

describe('WorkcellRuntime', () => {
  const analysisTool: WorkcellToolDefinition = {
    name: 'analysis',
    minimumAuthority: 1,
    handler: (task) => ({
      summary: `analysed ${(task.payload as { intent?: string }).intent ?? 'unknown'}`,
    }),
  };

  const agent: WorkcellAgentDefinition = {
    name: 'agent-a',
    authority: 2,
    allowedTools: ['analysis'],
    roles: ['developer'],
  };

  const baseOrder: WorkOrderSubmission = {
    orderId: 'order-1',
    submittedBy: 'architect',
    tenantId: 'tenant-1',
    userId: 'user-1',
    agentName: 'agent-a',
    roles: ['developer'],
    region: 'allowed-region',
    tasks: [
      {
        taskId: 'task-1',
        tool: 'analysis',
        action: 'workcell:execute',
        resource: 'analysis',
        payload: { intent: 'ship feature' },
      },
    ],
  };

  it('executes work orders and records ledger entries', async () => {
    const ledger = new ProvenanceLedger();
    const policy = new PolicyEngine([
      {
        id: 'allow-workcell',
        description: 'Allow developers to execute workcell tasks',
        effect: 'allow',
        actions: ['workcell:execute'],
        resources: ['analysis'],
        conditions: [
          { attribute: 'roles', operator: 'includes', value: ['developer'] },
          { attribute: 'region', operator: 'eq', value: 'allowed-region' },
        ],
      },
    ]);

    const runtime = new WorkcellRuntime({
      policy,
      ledger,
      tools: [analysisTool],
      agents: [agent],
    });
    const result = await runtime.submitOrder(baseOrder);

    expect(result.status).toBe('completed');
    expect(result.tasks[0].status).toBe('success');
    expect(result.tasks[0].output.summary).toContain('analysed');

    const entries = ledger.list({ category: 'workcell-task' });
    expect(entries.length).toBe(1);
    expect(entries[0].resource).toBe('analysis');
  });

  it('rejects tasks when policy denies execution', async () => {
    const ledger = new ProvenanceLedger();
    const policy = new PolicyEngine([
      {
        id: 'deny-high-risk',
        description: 'Block high-risk workcell execution',
        effect: 'deny',
        actions: ['workcell:execute'],
        resources: ['analysis'],
        conditions: [{ attribute: 'risk', operator: 'eq', value: 'high' }],
      },
    ]);

    const runtime = new WorkcellRuntime({
      policy,
      ledger,
      tools: [analysisTool],
      agents: [agent],
    });
    const result = await runtime.submitOrder({
      ...baseOrder,
      orderId: 'order-2',
      tasks: [
        {
          taskId: 'task-1',
          tool: 'analysis',
          action: 'workcell:execute',
          resource: 'analysis',
          payload: { intent: 'ship feature' },
        },
      ],
      attributes: { risk: 'high' },
    });

    expect(result.status).toBe('rejected');
    expect(result.tasks[0].status).toBe('rejected');
    expect(ledger.list({ category: 'workcell-task' })[0].action).toBe(
      'task.rejected',
    );
  });
});
