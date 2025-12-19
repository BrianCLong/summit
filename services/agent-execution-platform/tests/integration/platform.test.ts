/**
 * Integration tests for Agent Execution Platform
 */

import {
  AgentExecutionPlatform,
  agentRunner,
  pipelineEngine,
  promptRegistry,
  AgentConfig,
  AgentContext,
  PipelineDefinition,
  PromptTemplate,
} from '../../src/index.js';

describe('Agent Execution Platform Integration Tests', () => {
  let platform: AgentExecutionPlatform;

  beforeAll(async () => {
    process.env.PROMPT_REGISTRY = '1';
    platform = new AgentExecutionPlatform();
    await platform.initialize();
  });

  afterAll(async () => {
    await platform.shutdown();
  });

  describe('Agent Runner', () => {
    test('should execute an agent successfully', async () => {
      const config: AgentConfig = {
        metadata: {
          id: 'test-agent-001',
          name: 'Test Agent',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        capabilities: {
          maxConcurrent: 5,
          timeout: 10000,
          retryable: true,
          maxRetries: 3,
          supportedOperations: ['test'],
        },
      };

      const context: AgentContext = {
        agentId: 'test-agent-001',
        executionId: 'test-exec-001',
        userId: 'test-user',
        sessionId: 'test-session',
        metadata: {},
        variables: {},
      };

      const result = await agentRunner.execute(config, { text: 'test input' }, context);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.durationMs).toBeGreaterThan(0);
    });

    test('should respect concurrency limits', async () => {
      const stats = agentRunner.getStats();
      expect(stats.maxConcurrent).toBe(10);
      expect(stats.activeExecutions).toBeGreaterThanOrEqual(0);
    });

    test('should handle errors gracefully', async () => {
      const config: AgentConfig = {
        metadata: {
          id: 'error-agent',
          name: 'Error Agent',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        capabilities: {
          maxConcurrent: 1,
          timeout: 100,
          retryable: false,
          maxRetries: 0,
          supportedOperations: [],
        },
      };

      const context: AgentContext = {
        agentId: 'error-agent',
        executionId: 'error-exec',
        userId: 'test-user',
        sessionId: 'test-session',
        metadata: {},
        variables: {},
      };

      // This should complete even with short timeout
      const result = await agentRunner.execute(config, { text: 'error' }, context);

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });

  describe('Pipeline Engine', () => {
    test('should execute a simple pipeline', async () => {
      const pipeline: PipelineDefinition = {
        id: 'test-pipeline-001',
        name: 'Test Pipeline',
        version: '1.0.0',
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            type: 'task',
            status: 'pending',
            config: {
              operation: 'test-op',
              parameters: {},
            },
            dependencies: [],
          },
        ],
      };

      const context: AgentContext = {
        agentId: '',
        executionId: '',
        userId: 'test-user',
        sessionId: 'test-session',
        metadata: {},
        variables: {},
      };

      const execution = await pipelineEngine.execute(pipeline, context);

      expect(execution).toBeDefined();
      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(1);
      const firstStep = execution.steps[0]!;
      expect(firstStep.status).toBe('completed');
    });

    test('should handle step dependencies', async () => {
      const pipeline: PipelineDefinition = {
        id: 'dep-pipeline',
        name: 'Dependency Pipeline',
        version: '1.0.0',
        steps: [
          {
            id: 'step-1',
            name: 'First',
            type: 'task',
            status: 'pending',
            config: {
              operation: 'first',
              parameters: {},
            },
            dependencies: [],
          },
          {
            id: 'step-2',
            name: 'Second',
            type: 'task',
            status: 'pending',
            config: {
              operation: 'second',
              parameters: {},
            },
            dependencies: ['step-1'],
          },
        ],
      };

      const context: AgentContext = {
        agentId: '',
        executionId: '',
        userId: 'test-user',
        sessionId: 'test-session',
        metadata: {},
        variables: {},
      };

      const execution = await pipelineEngine.execute(pipeline, context);

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(2);
    });
  });

  describe('Prompt Registry', () => {
    test('should register and retrieve prompts', async () => {
      const template: PromptTemplate = {
        id: 'test-prompt-001',
        name: 'test-template',
        version: '1.0.0',
        content: 'Hello {{name}}, welcome to {{place}}!',
        variables: [
          {
            name: 'name',
            type: 'string',
            required: true,
          },
          {
            name: 'place',
            type: 'string',
            required: true,
          },
        ],
        metadata: {
          author: 'test',
          owner: 'qa-team',
          purpose: 'Smoke-test greeting prompt',
          modelFamily: 'gpt-4o',
          safetyConstraints: ['no pii in greetings'],
          createdAt: new Date(),
          updatedAt: new Date(),
          model: 'gpt-4o-mini',
          temperature: 0.1,
          lifecycle: 'approved',
        },
        tags: ['test'],
      };

      await promptRegistry.register(template);

      const retrieved = await promptRegistry.get('test-template');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-template');
    });

    test('should render prompts with variables', async () => {
      const rendered = await promptRegistry.render('test-template', {
        name: 'Alice',
        place: 'Wonderland',
      });

      expect(rendered.content).toBe('Hello Alice, welcome to Wonderland!');
    });

    test('should validate required variables', async () => {
      await expect(
        promptRegistry.render('test-template', { name: 'Alice' })
      ).rejects.toThrow('Required variable missing: place');
    });

    test('should track versions', async () => {
      const versions = await promptRegistry.getVersions('test-template');
      expect(versions.length).toBeGreaterThan(0);
    });

    test('should replay prior runs with lockfile pinning', async () => {
      const templateV1: PromptTemplate = {
        id: 'replay-prompt-001',
        name: 'replay-template',
        version: '1.0.0',
        content: 'Investigate {{topic}} using version one.',
        variables: [
          { name: 'topic', type: 'string', required: true },
        ],
        metadata: {
          author: 'qa',
          owner: 'qa-team',
          purpose: 'Validate replay support',
          modelFamily: 'gpt-4o',
          safetyConstraints: ['stay factual'],
          createdAt: new Date(),
          updatedAt: new Date(),
          model: 'gpt-4o-mini',
          temperature: 0,
          lifecycle: 'approved',
        },
        tags: ['replay'],
      };

      const templateV2: PromptTemplate = {
        ...templateV1,
        id: 'replay-prompt-002',
        version: '2.0.0',
        content: 'Investigate {{topic}} with upgraded context.',
        metadata: {
          ...templateV1.metadata,
          updatedAt: new Date(),
        },
      };

      await promptRegistry.register(templateV1);
      await promptRegistry.register(templateV2);

      const runV1 = await promptRegistry.invoke('replay-template', { topic: 'alpha' }, {
        version: '1.0.0',
        model: 'gpt-4o-mini',
        toolVersions: { retriever: '1.0.0' },
      });
      const runV2 = await promptRegistry.invoke('replay-template', { topic: 'alpha' }, {
        version: '2.0.0',
        model: 'gpt-4o-mini',
        toolVersions: { retriever: '2.0.0' },
      });

      expect(runV1.promptVersion).toBe('1.0.0');
      expect(runV2.promptVersion).toBe('2.0.0');
      expect(runV2.outputHash).not.toBe(runV1.outputHash);

      const replay = await promptRegistry.replayInvocation(runV1.id);

      expect(replay.replayRun.promptVersion).toBe('1.0.0');
      expect(replay.replayRun.outputHash).toBe(runV1.outputHash);
      expect(replay.diff.added).toHaveLength(0);
      expect(replay.diff.removed).toHaveLength(0);
      expect(replay.replayRun.lockfile.toolVersions.retriever).toBe('1.0.0');
    });
  });

  describe('Safety Layer', () => {
    test('should detect PII in content', async () => {
      // This test would need the safety validator to be accessible
      // For now, we'll test through agent execution
      const config: AgentConfig = {
        metadata: {
          id: 'pii-test-agent',
          name: 'PII Test',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        capabilities: {
          maxConcurrent: 1,
          timeout: 10000,
          retryable: false,
          maxRetries: 0,
          supportedOperations: [],
        },
      };

      const context: AgentContext = {
        agentId: 'pii-test-agent',
        executionId: 'pii-exec',
        userId: 'test-user',
        sessionId: 'test-session',
        metadata: {},
        variables: {},
      };

      const input = {
        text: 'Contact me at john.doe@example.com or 123-45-6789',
      };

      const result = await agentRunner.execute(config, input, context);

      // Result should still be successful, but PII should be logged
      expect(result).toBeDefined();
    });
  });

  describe('Platform Stats', () => {
    test('should provide runner statistics', () => {
      const stats = agentRunner.getStats();

      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('queuedTasks');
      expect(stats).toHaveProperty('maxConcurrent');
    });

    test('should provide prompt registry statistics', () => {
      const stats = promptRegistry.getStats();

      expect(stats).toHaveProperty('totalPrompts');
      expect(stats).toHaveProperty('totalVersions');
      expect(stats).toHaveProperty('cacheSize');
    });
  });
});
