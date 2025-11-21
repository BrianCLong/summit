/**
 * Code Refactoring Example
 *
 * Demonstrates using the Agentic Mesh to refactor code through
 * a multi-agent workflow: Planner -> Coder -> Critic -> Judge
 */

import {
  PlannerAgent,
  CoderAgent,
  CriticAgent,
  JudgeAgent,
  AgentFactory,
  createDefaultToolRegistry,
  type AgentServices,
  type TaskInput,
} from '@intelgraph/mesh-sdk';
import { createLogger, createMeshMetrics } from '@intelgraph/mesh-observability';

// Register agents
AgentFactory.register('planner', PlannerAgent);
AgentFactory.register('coder', CoderAgent);
AgentFactory.register('critic', CriticAgent);
AgentFactory.register('judge', JudgeAgent);

// Initialize services
const logger = createLogger('code-refactor-demo');
const metrics = createMeshMetrics('demo');
const toolRegistry = createDefaultToolRegistry();

/**
 * Mock services for demonstration
 */
function createDemoServices(): AgentServices {
  return {
    provenance: {
      record: async (event) => {
        logger.info('Provenance recorded', { type: event.type });
        return crypto.randomUUID();
      },
      query: async () => [],
    },
    tools: {
      invoke: async (name, input) => {
        logger.info('Tool invoked', { tool: name });
        return { success: true };
      },
      list: async () => toolRegistry.list(),
      get: async (name) => toolRegistry.get(name) ?? null,
    },
    model: {
      complete: async (prompt, options) => {
        logger.info('Model called', { model: options?.model ?? 'default' });
        // Simulated response
        return {
          content: `Refactored code: \`\`\`typescript
// Clean, refactored implementation
export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(credentials.email);
    if (!user) return { success: false, error: 'User not found' };

    const valid = await this.verifyPassword(credentials.password, user.passwordHash);
    return valid
      ? { success: true, token: this.generateToken(user) }
      : { success: false, error: 'Invalid password' };
  }
}
\`\`\``,
          tokensIn: 500,
          tokensOut: 300,
          latencyMs: 1500,
          model: 'claude-sonnet-4-5-20250929',
          provider: 'anthropic',
        };
      },
      chat: async () => ({
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: 0,
        model: '',
        provider: '',
      }),
    },
    mesh: {
      spawnSubtask: async (type, input) => {
        logger.info('Subtask spawned', { type });
        return crypto.randomUUID();
      },
      awaitSubtask: async () => ({
        taskId: '',
        status: 'completed' as const,
        result: {},
        metadata: {
          tokensUsed: 0,
          costUsd: 0,
          latencyMs: 0,
          modelCallCount: 0,
          toolCallCount: 0,
          provenanceRecordIds: [],
        },
      }),
      requestAgent: async () => null,
    },
    metrics: {
      increment: (name, tags) => metrics.tasksTotal.inc(tags ?? {}),
      gauge: (name, value, tags) => {},
      histogram: (name, value, tags) => {},
      timing: (name, duration, tags) => {},
    },
    logger,
  };
}

/**
 * Run the code refactoring workflow
 */
async function runCodeRefactorWorkflow() {
  console.log('\n=== Code Refactoring Workflow Demo ===\n');

  const services = createDemoServices();

  // Step 1: Create the coder agent
  const coder = AgentFactory.create('coder') as CoderAgent;
  console.log('Created coder agent:', coder.getFullDescriptor().name);

  // Step 2: Submit refactoring task
  const taskInput: TaskInput<{
    action: 'refactor';
    specification: string;
    targetFiles: string[];
  }> = {
    task: {
      id: crypto.randomUUID(),
      type: 'code_refactor',
      input: {},
      priority: 1,
      metadata: { requester: 'demo@example.com' },
      createdAt: new Date().toISOString(),
    },
    context: {
      routingDecision: {
        selectedAgent: coder.getId(),
        selectedModel: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
        strategy: 'max_quality',
        confidence: 0.9,
        alternatives: [],
        decidedAt: new Date().toISOString(),
      },
      availableTools: toolRegistry.list(),
      budgetRemaining: { maxTokens: 10000, maxCostUsd: 1.0 },
      deadline: new Date(Date.now() + 300000).toISOString(),
    },
    payload: {
      action: 'refactor',
      specification: 'Extract authentication logic into a clean AuthService class with dependency injection',
      targetFiles: ['src/api/auth.ts'],
    },
  };

  console.log('\nSubmitting refactoring task...');
  const result = await coder.onTaskReceived(taskInput, services);

  console.log('\n--- Result ---');
  console.log('Status:', result.status);
  if (result.result) {
    console.log('Code generated:', result.result.code?.substring(0, 200) + '...');
  }
  console.log('Tokens used:', result.metadata.tokensUsed);
  console.log('Latency:', result.metadata.latencyMs, 'ms');

  // Step 3: Critic review
  console.log('\n--- Critic Review ---');
  const critic = AgentFactory.create('critic') as CriticAgent;

  const criticInput: TaskInput<{
    content: string;
    contentType: 'code';
  }> = {
    task: {
      id: crypto.randomUUID(),
      type: 'critic_review',
      input: {},
      priority: 1,
      metadata: {},
      createdAt: new Date().toISOString(),
    },
    context: taskInput.context,
    payload: {
      content: result.result?.code ?? '',
      contentType: 'code',
    },
  };

  // Mock critic response
  console.log('Critic verdict: APPROVED');
  console.log('Score: 92/100');

  console.log('\n=== Workflow Complete ===\n');
}

// Run if executed directly
runCodeRefactorWorkflow().catch(console.error);
