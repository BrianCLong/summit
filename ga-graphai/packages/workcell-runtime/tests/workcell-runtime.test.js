"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const policy_1 = require("policy");
const prov_ledger_1 = require("prov-ledger");
const index_1 = require("../src/index");
(0, vitest_1.describe)('WorkcellRuntime', () => {
    const analysisTool = {
        name: 'analysis',
        minimumAuthority: 1,
        handler: (task) => ({
            summary: `analysed ${task.payload.intent ?? 'unknown'}`,
        }),
    };
    const agent = {
        name: 'agent-a',
        authority: 2,
        allowedTools: ['analysis'],
        roles: ['developer'],
    };
    const baseOrder = {
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
    (0, vitest_1.it)('executes work orders and records ledger entries', async () => {
        const ledger = new prov_ledger_1.ProvenanceLedger();
        const policy = new policy_1.PolicyEngine([
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
        const runtime = new index_1.WorkcellRuntime({
            policy,
            ledger,
            tools: [analysisTool],
            agents: [agent],
        });
        const result = await runtime.submitOrder(baseOrder);
        (0, vitest_1.expect)(result.status).toBe('completed');
        (0, vitest_1.expect)(result.tasks[0].status).toBe('success');
        (0, vitest_1.expect)(result.tasks[0].output.summary).toContain('analysed');
        const entries = ledger.list({ category: 'workcell-task' });
        (0, vitest_1.expect)(entries.length).toBe(1);
        (0, vitest_1.expect)(entries[0].resource).toBe('analysis');
    });
    (0, vitest_1.it)('rejects tasks when policy denies execution', async () => {
        const ledger = new prov_ledger_1.ProvenanceLedger();
        const policy = new policy_1.PolicyEngine([
            {
                id: 'deny-high-risk',
                description: 'Block high-risk workcell execution',
                effect: 'deny',
                actions: ['workcell:execute'],
                resources: ['analysis'],
                conditions: [{ attribute: 'risk', operator: 'eq', value: 'high' }],
            },
        ]);
        const runtime = new index_1.WorkcellRuntime({
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
        (0, vitest_1.expect)(result.status).toBe('rejected');
        (0, vitest_1.expect)(result.tasks[0].status).toBe('rejected');
        (0, vitest_1.expect)(ledger.list({ category: 'workcell-task' })[0].action).toBe('task.rejected');
    });
});
