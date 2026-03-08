"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const orchestrator_js_1 = require("../orchestrator.js");
// Mock MCP client
const mockClient = {
    executeTool: globals_1.jest.fn(),
};
(0, globals_1.describe)('MCPOrchestrator', () => {
    let orchestrator;
    (0, globals_1.beforeEach)(() => {
        orchestrator = new orchestrator_js_1.MCPOrchestrator(mockClient);
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('workflow registration', () => {
        (0, globals_1.it)('registers and retrieves workflows', () => {
            const workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                steps: [
                    { id: 'step1', name: 'Step 1', tool: 'test.tool', args: {} },
                ],
            };
            orchestrator.registerWorkflow(workflow);
            const workflows = orchestrator.listWorkflows();
            (0, globals_1.expect)(workflows).toHaveLength(1);
            (0, globals_1.expect)(workflows[0].id).toBe('test-workflow');
        });
        (0, globals_1.it)('rejects circular dependencies on execution', async () => {
            const workflow = {
                id: 'circular',
                name: 'Circular',
                steps: [
                    { id: 'a', name: 'A', tool: 't', args: {}, dependsOn: ['b'] },
                    { id: 'b', name: 'B', tool: 't', args: {}, dependsOn: ['a'] },
                ],
            };
            orchestrator.registerWorkflow(workflow);
            await (0, globals_1.expect)(orchestrator.executeWorkflow('circular')).rejects.toThrow('Circular');
        });
    });
    (0, globals_1.describe)('workflow execution', () => {
        (0, globals_1.it)('executes steps in dependency order', async () => {
            mockClient.executeTool.mockImplementation(async () => ({ result: 'ok' }));
            const workflow = {
                id: 'ordered',
                name: 'Ordered',
                steps: [
                    { id: 'first', name: 'First', tool: 'test.first', args: {}, server: 's1' },
                    { id: 'second', name: 'Second', tool: 'test.second', args: {}, dependsOn: ['first'], server: 's1' },
                ],
            };
            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('ordered');
            (0, globals_1.expect)(execution.status).toBe('completed');
            (0, globals_1.expect)(execution.stepResults).toHaveLength(2);
            (0, globals_1.expect)(execution.stepResults[0].stepId).toBe('first');
            (0, globals_1.expect)(execution.stepResults[1].stepId).toBe('second');
        });
        (0, globals_1.it)('provides self-evaluation on completion', async () => {
            mockClient.executeTool.mockImplementation(async () => ({ data: 'test' }));
            const workflow = {
                id: 'eval-test',
                name: 'Eval Test',
                steps: [
                    { id: 's1', name: 'S1', tool: 't', args: {}, server: 'srv' },
                ],
            };
            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('eval-test');
            (0, globals_1.expect)(execution.evaluation).toBeDefined();
            (0, globals_1.expect)(execution.evaluation?.score).toBe(100);
        });
        (0, globals_1.it)('passes blackboard context to dynamic args', async () => {
            mockClient.executeTool.mockImplementation((_s, _t, args) => {
                return Promise.resolve(args);
            });
            const workflow = {
                id: 'dynamic',
                name: 'Dynamic',
                steps: [
                    { id: 'init', name: 'Init', tool: 't', args: { value: 42 }, server: 's' },
                    {
                        id: 'use',
                        name: 'Use',
                        tool: 't',
                        args: (ctx) => ({ prev: ctx.results['init'].value }),
                        dependsOn: ['init'],
                        server: 's',
                    },
                ],
            };
            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('dynamic');
            (0, globals_1.expect)(execution.stepResults[1].result).toEqual({ prev: 42 });
        });
        (0, globals_1.it)('skips steps when condition returns false', async () => {
            mockClient.executeTool.mockImplementation(async () => ({}));
            const workflow = {
                id: 'conditional',
                name: 'Conditional',
                steps: [
                    {
                        id: 'maybe',
                        name: 'Maybe',
                        tool: 't',
                        args: {},
                        server: 's',
                        condition: (ctx) => ctx.state.runIt === true,
                    },
                ],
            };
            orchestrator.registerWorkflow(workflow);
            const execution = await orchestrator.executeWorkflow('conditional', { runIt: false });
            (0, globals_1.expect)(execution.stepResults[0].status).toBe('skipped');
        });
    });
    (0, globals_1.describe)('WorkflowRecipes', () => {
        (0, globals_1.it)('creates lead assignment workflow', () => {
            const workflow = orchestrator_js_1.WorkflowRecipes.leadAssignment('lead-123');
            (0, globals_1.expect)(workflow.id).toBe('lead-assignment');
            (0, globals_1.expect)(workflow.steps).toHaveLength(4);
        });
        (0, globals_1.it)('creates entity enrichment workflow with budget', () => {
            const workflow = orchestrator_js_1.WorkflowRecipes.entityEnrichment('entity-456');
            (0, globals_1.expect)(workflow.id).toBe('entity-enrichment');
            (0, globals_1.expect)(workflow.budgetLimit).toBe(500);
        });
        (0, globals_1.it)('creates audit trail workflow with governance', () => {
            const workflow = orchestrator_js_1.WorkflowRecipes.auditTrail('CREATE', 'res-789');
            (0, globals_1.expect)(workflow.governancePolicy).toBeDefined();
            (0, globals_1.expect)(workflow.governancePolicy?.auditLevel).toBe('full');
        });
    });
});
