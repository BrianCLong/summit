import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPOrchestrator, WorkflowDefinition, WorkflowRecipes } from '../orchestrator.js';

// Mock MCP client
const mockClient = {
  executeTool: vi.fn(),
};

describe('MCPOrchestrator', () => {
  let orchestrator: MCPOrchestrator;

  beforeEach(() => {
    orchestrator = new MCPOrchestrator(mockClient as any);
    vi.clearAllMocks();
  });

  describe('workflow registration', () => {
    it('registers and retrieves workflows', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        steps: [
          { id: 'step1', name: 'Step 1', tool: 'test.tool', args: {} },
        ],
      };

      orchestrator.registerWorkflow(workflow);
      const workflows = orchestrator.listWorkflows();

      expect(workflows).toHaveLength(1);
      expect(workflows[0].id).toBe('test-workflow');
    });

    it('rejects circular dependencies', () => {
      const workflow: WorkflowDefinition = {
        id: 'circular',
        name: 'Circular',
        steps: [
          { id: 'a', name: 'A', tool: 't', args: {}, dependsOn: ['b'] },
          { id: 'b', name: 'B', tool: 't', args: {}, dependsOn: ['a'] },
        ],
      };

      expect(() => orchestrator.registerWorkflow(workflow)).toThrow('Circular');
    });
  });

  describe('workflow execution', () => {
    it('executes steps in dependency order', async () => {
      mockClient.executeTool.mockResolvedValue({ result: 'ok' });

      const workflow: WorkflowDefinition = {
        id: 'ordered',
        name: 'Ordered',
        steps: [
          { id: 'first', name: 'First', tool: 'test.first', args: {}, server: 's1' },
          { id: 'second', name: 'Second', tool: 'test.second', args: {}, dependsOn: ['first'], server: 's1' },
        ],
      };

      orchestrator.registerWorkflow(workflow);
      const execution = await orchestrator.executeWorkflow('ordered');

      expect(execution.status).toBe('completed');
      expect(execution.stepResults).toHaveLength(2);
      expect(execution.stepResults[0].stepId).toBe('first');
      expect(execution.stepResults[1].stepId).toBe('second');
    });

    it('provides self-evaluation on completion', async () => {
      mockClient.executeTool.mockResolvedValue({ data: 'test' });

      const workflow: WorkflowDefinition = {
        id: 'eval-test',
        name: 'Eval Test',
        steps: [
          { id: 's1', name: 'S1', tool: 't', args: {}, server: 'srv' },
        ],
      };

      orchestrator.registerWorkflow(workflow);
      const execution = await orchestrator.executeWorkflow('eval-test');

      expect(execution.evaluation).toBeDefined();
      expect(execution.evaluation?.score).toBe(100);
    });

    it('passes blackboard context to dynamic args', async () => {
      mockClient.executeTool.mockImplementation((_s, _t, args) => {
        return Promise.resolve(args);
      });

      const workflow: WorkflowDefinition = {
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

      expect(execution.stepResults[1].result).toEqual({ prev: 42 });
    });

    it('skips steps when condition returns false', async () => {
      mockClient.executeTool.mockResolvedValue({});

      const workflow: WorkflowDefinition = {
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

      expect(execution.stepResults[0].status).toBe('skipped');
    });
  });

  describe('WorkflowRecipes', () => {
    it('creates lead assignment workflow', () => {
      const workflow = WorkflowRecipes.leadAssignment('lead-123');
      expect(workflow.id).toBe('lead-assignment');
      expect(workflow.steps).toHaveLength(4);
    });

    it('creates entity enrichment workflow with budget', () => {
      const workflow = WorkflowRecipes.entityEnrichment('entity-456');
      expect(workflow.id).toBe('entity-enrichment');
      expect(workflow.budgetLimit).toBe(500);
    });

    it('creates audit trail workflow with governance', () => {
      const workflow = WorkflowRecipes.auditTrail('CREATE', 'res-789');
      expect(workflow.governancePolicy).toBeDefined();
      expect(workflow.governancePolicy?.auditLevel).toBe('full');
    });
  });
});
