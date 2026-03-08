"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workflowEngine_1 = require("../src/workflowEngine");
describe('WorkflowEngine', () => {
    const steps = [
        {
            id: 'prepare',
            name: 'Prepare payload',
            async execute(input) {
                return { ...input, prepared: true };
            }
        },
        {
            id: 'approve',
            name: 'Approval',
            approval: { required: true },
            async execute(input) {
                return { ...input, approved: true };
            }
        },
        {
            id: 'finalize',
            name: 'Finalize',
            async execute(input) {
                if (!input.approved)
                    throw new Error('not approved');
                return { ...input, completed: true };
            },
            maxAttempts: 1
        }
    ];
    it('pauses for approvals and resumes after approval', async () => {
        const engine = new workflowEngine_1.WorkflowEngine([{ tenantId: 't1', limit: 1 }]);
        const workflow = engine.startWorkflow('t1', steps, { tenant: 't1' });
        const paused = await engine.run(workflow.id);
        expect(paused?.state).toBe('paused');
        engine.approve(workflow.id, 'approve', 'owner');
        const completed = await engine.run(workflow.id);
        expect(completed.state).toBe('completed');
        expect(completed.payload.completed).toBe(true);
    });
    it('sends failing workflows to DLQ respecting concurrency', async () => {
        const engine = new workflowEngine_1.WorkflowEngine([{ tenantId: 't1', limit: 1 }]);
        const failingSteps = [
            {
                id: 'explode',
                name: 'Explode',
                async execute() {
                    throw new Error('boom');
                },
                maxAttempts: 1
            }
        ];
        const workflow = engine.startWorkflow('t1', failingSteps, { tenant: 't1' });
        const result = await engine.run(workflow.id);
        expect(result.state).toBe('failed');
        expect(engine.dlq().length).toBe(1);
        expect(() => engine.startWorkflow('t1', failingSteps, { tenant: 't1' })).not.toThrow();
    });
});
