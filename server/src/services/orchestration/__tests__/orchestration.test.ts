import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AgentOrchestrator } from '../AgentOrchestrator';
import { AgentLifecycleManager } from '../AgentLifecycleManager';
import { AgentTask, AgentCapability } from '../types';
import { InMemoryPersistence } from '../persistence';

describe('AgentOrchestrator System', () => {
  let orchestrator: AgentOrchestrator;
  let lifecycleManager: AgentLifecycleManager;

  beforeEach(() => {
    jest.useFakeTimers();
    orchestrator = AgentOrchestrator.getInstance();
    lifecycleManager = AgentLifecycleManager.getInstance();

    // Clear state
    (lifecycleManager as any).agents.clear();
    // Reset persistence
    orchestrator.persistence = new InMemoryPersistence();
    (orchestrator.policyEngine as any).evaluate = jest.fn(async () => ({
      allowed: true,
      reason: 'Allowed',
    }));
  });

  afterEach(() => {
    orchestrator.shutdown();
    lifecycleManager.shutdown();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should register an agent', () => {
    const agent = lifecycleManager.registerAgent({
      id: 'agent-1',
      name: 'Test Agent',
      role: 'worker',
      capabilities: [{ name: 'coding', version: '1.0' }],
      version: '1.0.0'
    });

    expect(agent).toBeDefined();
    expect(lifecycleManager.getAgent('agent-1')).toBeDefined();
  });

  it('should route a task to a capable agent', async () => {
    // Register agent
    lifecycleManager.registerAgent({
      id: 'coder-1',
      name: 'Coder',
      role: 'dev',
      capabilities: [{ name: 'typescript', version: '1.0' }],
      version: '1.0'
    });

    // Create task
    const taskId = await orchestrator.submitTask({
      title: 'Write Code',
      description: 'Write some TS',
      priority: 'high',
      input: {},
      requiredCapabilities: ['typescript']
    });

    // Manually trigger processing
    await (orchestrator as any).processQueue();

    const task = await orchestrator.persistence.getTask(taskId);
    expect(task?.status).toBe('assigned');
    expect(task?.assignedTo).toBe('coder-1');
  });

  it('should not route task if no agent has capability', async () => {
     // Register agent
     lifecycleManager.registerAgent({
        id: 'writer-1',
        name: 'Writer',
        role: 'writer',
        capabilities: [{ name: 'english', version: '1.0' }],
        version: '1.0'
      });

      // Create task requiring different capability
      const taskId = await orchestrator.submitTask({
        title: 'Write Code',
        description: 'Write some TS',
        priority: 'high',
        input: {},
        requiredCapabilities: ['typescript']
      });

      await (orchestrator as any).processQueue();

      const task = await orchestrator.persistence.getTask(taskId);
      expect(task?.status).toBe('pending');
      expect(task?.assignedTo).toBeUndefined();
  });
});
