import { describe, expect, it } from 'vitest';
import { GatewayRuntime } from '../src/index';

const gateway = new GatewayRuntime({
  seedEntries: [
    {
      id: 'seed-1',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'api',
      payload: { version: '1.0.0' }
    }
  ]
});

describe('GatewayRuntime', () => {
  it('lists ledger entries through GraphQL', async () => {
    const result = await gateway.execute(
      `query Entries($category: String) {
        ledgerEntries(category: $category) {
          id
          category
          actor
        }
      }`,
      { category: 'deployment' }
    );

    expect(result.errors).toBeUndefined();
    const entries = (result.data as { ledgerEntries: Array<{ id: string }> }).ledgerEntries;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].id).toBe('seed-1');
  });

  it('appends ledger entries via mutation', async () => {
    const result = await gateway.execute(
      `mutation AddEntry($input: LedgerEntryInput!) {
        appendLedgerEntry(input: $input) {
          id
          hash
        }
      }`,
      {
        input: {
          id: 'change-1',
          category: 'policy',
          actor: 'compliance',
          action: 'approve',
          resource: 'llm',
          payload: { ticket: 'SEC-1' }
        }
      }
    );

    expect(result.errors).toBeUndefined();
    const data = result.data as { appendLedgerEntry: { id: string; hash: string } };
    expect(data.appendLedgerEntry.id).toBe('change-1');
    expect(data.appendLedgerEntry.hash).toBeTruthy();
  });

  it('simulates policy decisions', async () => {
    const result = await gateway.execute(
      `mutation Sim($input: PolicyEvaluationInput!) {
        simulatePolicy(input: $input) {
          allowed
          effect
          matchedRules
        }
      }`,
      {
        input: {
          action: 'intent:read',
          resource: 'intent',
          tenantId: 'tenant-1',
          userId: 'user-1',
          roles: ['product-manager'],
          region: 'allowed-region'
        }
      }
    );

    expect(result.errors).toBeUndefined();
    const data = result.data as {
      simulatePolicy: { allowed: boolean; effect: string; matchedRules: string[] };
    };
    expect(data.simulatePolicy.allowed).toBe(true);
    expect(data.simulatePolicy.effect).toBe('ALLOW');
    expect(data.simulatePolicy.matchedRules.length).toBeGreaterThan(0);
  });

  it('submits work orders through GraphQL', async () => {
    const runtime = new GatewayRuntime({
      workcell: {
        tools: [
          {
            name: 'analysis',
            minimumAuthority: 1,
            handler: task => ({
              summary: `analysis for ${(task.payload as { intent?: string }).intent ?? 'unknown'}`
            })
          }
        ],
        agents: [
          {
            name: 'agent-a',
            authority: 2,
            allowedTools: ['analysis'],
            roles: ['developer']
          }
        ]
      }
    });

    const submitResult = await runtime.execute(
      `mutation Submit($input: WorkOrderInput!) {
        submitWorkOrder(input: $input) {
          orderId
          status
          tasks {
            taskId
            status
          }
        }
      }`,
      {
        input: {
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
              payload: { intent: 'ship feature' }
            }
          ]
        }
      }
    );

    expect(submitResult.errors).toBeUndefined();
    const submission = submitResult.data as {
      submitWorkOrder: {
        orderId: string;
        status: string;
        tasks: Array<{ taskId: string; status: string }>;
      };
    };
    expect(submission.submitWorkOrder.status).toBe('COMPLETED');
    expect(submission.submitWorkOrder.tasks[0].status).toBe('SUCCESS');

    const ordersResult = await runtime.execute(`{ workOrders { orderId status } }`);
    expect(ordersResult.errors).toBeUndefined();
    const orders = (ordersResult.data as { workOrders: Array<{ orderId: string; status: string }> }).workOrders;
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].orderId).toBe('order-1');
  });

  it('enforces policy on work order submission', async () => {
    const runtime = new GatewayRuntime({
      rules: [
        {
          id: 'deny-risk',
          description: 'deny high risk analysis orders',
          effect: 'deny',
          actions: ['workcell:execute'],
          resources: ['analysis'],
          conditions: [{ attribute: 'risk', operator: 'eq', value: 'high' }]
        }
      ],
      workcell: {
        tools: [
          {
            name: 'analysis',
            handler: () => ({ complete: true })
          }
        ],
        agents: [
          {
            name: 'agent-a',
            authority: 2,
            allowedTools: ['analysis'],
            roles: ['developer']
          }
        ]
      }
    });

    const submitResult = await runtime.execute(
      `mutation Submit($input: WorkOrderInput!) {
        submitWorkOrder(input: $input) {
          status
          tasks { status }
        }
      }`,
      {
        input: {
          orderId: 'order-2',
          submittedBy: 'architect',
          tenantId: 'tenant-1',
          userId: 'user-1',
          agentName: 'agent-a',
          roles: ['developer'],
          region: 'allowed-region',
          attributes: { risk: 'high' },
          tasks: [
            {
              taskId: 'task-1',
              tool: 'analysis',
              action: 'workcell:execute',
              resource: 'analysis',
              payload: { intent: 'ship feature' }
            }
          ]
        }
      }
    );

    expect(submitResult.errors).toBeUndefined();
    const submission = submitResult.data as {
      submitWorkOrder: { status: string; tasks: Array<{ status: string }> };
    };
    expect(submission.submitWorkOrder.status).toBe('REJECTED');
    expect(submission.submitWorkOrder.tasks[0].status).toBe('REJECTED');
  });
});
