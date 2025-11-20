/**
 * Example Usage of Multi-Agent System
 * Demonstrates how to set up and use the multi-agent orchestration system
 */

import pino from 'pino';
import {
  AgentConfig,
  AgentCapability,
  AgentPriority,
  AgentRegistry,
  MessageBus,
  LLMProviderFactory,
  Task,
  TaskStatus,
  Workflow,
} from '@intelgraph/agent-framework';
import {
  TaskQueue,
  Scheduler,
  WorkflowEngine,
} from '@intelgraph/agent-orchestrator';
import { DataCollectionAgent } from './DataCollectionAgent.js';
import { AnalysisAgent } from './AnalysisAgent.js';
import { SynthesisAgent } from './SynthesisAgent.js';

// Initialize logger
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
  },
});

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Example 1: Setting up the agent system
 */
async function setupAgentSystem() {
  logger.info('Setting up multi-agent system');

  // 1. Create core infrastructure
  const registry = new AgentRegistry(REDIS_URL, logger);
  const messageBus = new MessageBus({ redisUrl: REDIS_URL }, logger);

  const taskQueue = new TaskQueue(
    {
      redisUrl: REDIS_URL,
      queueName: 'agent-tasks',
      concurrency: 10,
    },
    logger,
  );

  const scheduler = new Scheduler(
    registry,
    {
      loadBalancingStrategy: 'best-fit',
      maxRetries: 3,
    },
    logger,
  );

  const workflowEngine = new WorkflowEngine(
    taskQueue,
    scheduler,
    {
      redisUrl: REDIS_URL,
      maxConcurrentWorkflows: 50,
    },
    logger,
  );

  // 2. Create and register agents
  const agents = await createAgents(registry, messageBus, logger);

  // 3. Start registry monitoring
  registry.startMonitoring();

  logger.info('Multi-agent system ready');

  return {
    registry,
    messageBus,
    taskQueue,
    scheduler,
    workflowEngine,
    agents,
  };
}

/**
 * Example 2: Creating and registering agents
 */
async function createAgents(
  registry: AgentRegistry,
  messageBus: MessageBus,
  logger: any,
) {
  const agents = [];

  // Create Data Collection Agent
  const collectorConfig: AgentConfig = {
    id: 'collector-1',
    name: 'Data Collection Agent',
    type: 'data-collection',
    version: '1.0.0',
    capabilities: [
      AgentCapability.OSINT_COLLECTION,
      AgentCapability.WEB_SCRAPING,
      AgentCapability.API_INTEGRATION,
    ],
    priority: AgentPriority.NORMAL,
    resources: {
      maxConcurrentTasks: 5,
      timeout: 300000,
    },
    llmConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20250101',
      temperature: 0.7,
      maxTokens: 4096,
    },
  };

  const collectorAgent = new DataCollectionAgent(collectorConfig, logger);
  await collectorAgent.initialize();
  await collectorAgent.start();
  await registry.register(collectorConfig);
  await messageBus.subscribeAgent(collectorConfig.id);
  agents.push(collectorAgent);

  // Create Analysis Agent
  const analysisConfig: AgentConfig = {
    id: 'analyzer-1',
    name: 'Analysis Agent',
    type: 'analysis',
    version: '1.0.0',
    capabilities: [
      AgentCapability.NLP_ANALYSIS,
      AgentCapability.GRAPH_ANALYSIS,
      AgentCapability.SENTIMENT_ANALYSIS,
      AgentCapability.PATTERN_RECOGNITION,
      AgentCapability.ANOMALY_DETECTION,
    ],
    priority: AgentPriority.NORMAL,
    resources: {
      maxConcurrentTasks: 3,
      timeout: 600000,
    },
    llmConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20250101',
      temperature: 0.5,
      maxTokens: 8192,
    },
  };

  const analysisAgent = new AnalysisAgent(analysisConfig, logger);
  await analysisAgent.initialize();
  await analysisAgent.start();
  await registry.register(analysisConfig);
  await messageBus.subscribeAgent(analysisConfig.id);
  agents.push(analysisAgent);

  // Create Synthesis Agent
  const synthesisConfig: AgentConfig = {
    id: 'synthesizer-1',
    name: 'Synthesis Agent',
    type: 'synthesis',
    version: '1.0.0',
    capabilities: [
      AgentCapability.REPORT_GENERATION,
      AgentCapability.SUMMARIZATION,
    ],
    priority: AgentPriority.NORMAL,
    resources: {
      maxConcurrentTasks: 2,
      timeout: 600000,
    },
    llmConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20250101',
      temperature: 0.7,
      maxTokens: 16384,
    },
  };

  const synthesisAgent = new SynthesisAgent(synthesisConfig, logger);
  await synthesisAgent.initialize();
  await synthesisAgent.start();
  await registry.register(synthesisConfig);
  await messageBus.subscribeAgent(synthesisConfig.id);
  agents.push(synthesisAgent);

  logger.info(`Created and registered ${agents.length} agents`);

  return agents;
}

/**
 * Example 3: Executing a simple task
 */
async function executeSimpleTask(system: any) {
  const { taskQueue, scheduler } = system;

  logger.info('Executing simple task');

  // Create a task
  const task: Task = {
    id: 'task-001',
    type: 'osint:collect',
    priority: AgentPriority.HIGH,
    status: TaskStatus.PENDING,
    input: {
      target: 'entity-123',
      sources: ['social_media', 'public_records'],
      depth: 2,
    },
    dependencies: [],
    createdAt: new Date().toISOString(),
  };

  // Schedule the task
  const decision = await scheduler.schedule(task);
  logger.info({ decision }, 'Task scheduled');

  // Register handler
  taskQueue.registerHandler('osint:collect', async (task: Task) => {
    logger.info({ taskId: task.id }, 'Executing OSINT collection');
    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      target: task.input.target,
      dataCollected: true,
      itemsFound: 42,
    };
  });

  // Enqueue and process
  await taskQueue.enqueue(task);
  await taskQueue.startProcessing(5);

  // Wait for completion
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const completedTask = await taskQueue.getTask(task.id);
  logger.info({ completedTask }, 'Task completed');

  return completedTask;
}

/**
 * Example 4: Executing a workflow
 */
async function executeWorkflow(system: any) {
  const { workflowEngine } = system;

  logger.info('Executing intelligence analysis workflow');

  // Define workflow
  const workflow: Workflow = {
    id: 'intel-workflow-001',
    name: 'Intelligence Analysis Workflow',
    version: '1.0.0',
    description: 'End-to-end intelligence collection and analysis',
    tasks: [
      {
        id: 'collect-osint',
        agentType: 'osint:collect',
        input: {
          target: 'entity-456',
          sources: ['social_media', 'news', 'public_records'],
        },
        dependencies: [],
      },
      {
        id: 'scrape-web',
        agentType: 'web:scrape',
        input: {
          url: 'https://example.com',
          maxPages: 5,
        },
        dependencies: [],
      },
      {
        id: 'analyze-nlp',
        agentType: 'nlp:analyze',
        input: {
          extractEntities: true,
          extractKeywords: true,
        },
        dependencies: ['collect-osint', 'scrape-web'],
      },
      {
        id: 'analyze-sentiment',
        agentType: 'sentiment:analyze',
        input: {
          granularity: 'aspect',
        },
        dependencies: ['analyze-nlp'],
      },
      {
        id: 'detect-patterns',
        agentType: 'pattern:detect',
        input: {
          patternType: 'temporal',
          threshold: 0.8,
        },
        dependencies: ['analyze-nlp'],
      },
      {
        id: 'generate-report',
        agentType: 'report:generate',
        input: {
          title: 'Intelligence Analysis Report',
          format: 'markdown',
          classification: 'UNCLASSIFIED',
          sections: [
            'Executive Summary',
            'Data Sources',
            'Key Findings',
            'Analysis',
            'Patterns Detected',
            'Recommendations',
          ],
        },
        dependencies: ['analyze-sentiment', 'detect-patterns'],
      },
    ],
  };

  // Register workflow
  await workflowEngine.registerWorkflow(workflow);

  // Execute workflow
  const execution = await workflowEngine.executeWorkflow(workflow.id, {
    requestedBy: 'analyst-user-123',
    priority: 'high',
  });

  // Monitor execution
  workflowEngine.on('workflow:task:completed', ({ execution, task }) => {
    logger.info(
      { executionId: execution.id, taskId: task.id, status: task.status },
      'Workflow task completed',
    );
  });

  workflowEngine.on('workflow:completed', (execution) => {
    logger.info(
      { executionId: execution.id, duration: execution.completedAt },
      'Workflow completed',
    );
  });

  logger.info({ executionId: execution.id }, 'Workflow execution started');

  return execution;
}

/**
 * Example 5: Inter-agent communication
 */
async function demonstrateInterAgentComm(system: any) {
  const { messageBus } = system;

  logger.info('Demonstrating inter-agent communication');

  // Subscribe to a topic
  await messageBus.subscribeTopic('analyzer-1', 'data:available');

  // Listen for messages
  messageBus.on('agent:analyzer-1', (message) => {
    logger.info({ message }, 'Analyzer received message');
  });

  // Broadcast data availability
  await messageBus.broadcast('collector-1', 'data:available', {
    dataType: 'osint',
    itemCount: 150,
    timestamp: new Date().toISOString(),
  });

  // Query another agent
  try {
    const response = await messageBus.query(
      'synthesizer-1',
      'analyzer-1',
      {
        query: 'What patterns have you detected?',
      },
      10000, // 10 second timeout
    );

    logger.info({ response }, 'Received query response');
  } catch (error) {
    logger.error({ error }, 'Query timeout');
  }
}

/**
 * Example 6: Monitoring and metrics
 */
async function monitorSystem(system: any) {
  const { registry, taskQueue, agents } = system;

  logger.info('Monitoring system health and metrics');

  // Get registry statistics
  const registryStats = await registry.getStats();
  logger.info({ registryStats }, 'Registry statistics');

  // Get queue statistics
  const queueStats = await taskQueue.getStats();
  logger.info({ queueStats }, 'Queue statistics');

  // Get agent metrics
  for (const agent of agents) {
    const metrics = agent.getMetrics();
    logger.info(
      {
        agentId: agent.id,
        tasksCompleted: metrics.tasksCompleted,
        tasksFailed: metrics.tasksFailed,
        avgExecutionTime: metrics.averageExecutionTime,
        apiCost: metrics.apiCostUSD,
        healthStatus: metrics.healthStatus,
      },
      'Agent metrics',
    );

    // Perform health check
    const healthy = await agent.healthCheck();
    logger.info({ agentId: agent.id, healthy }, 'Health check result');
  }

  // Find available agents
  const availableAnalyzers = await registry.findAvailable(
    AgentCapability.NLP_ANALYSIS,
  );
  logger.info(
    { count: availableAnalyzers.length },
    'Available NLP analyzers',
  );

  // Find best agent for a capability
  const bestAnalyzer = await registry.findBest(
    AgentCapability.GRAPH_ANALYSIS,
    'success_rate',
  );
  if (bestAnalyzer) {
    logger.info(
      { agentId: bestAnalyzer.config.id },
      'Best graph analysis agent',
    );
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Setup the system
    const system = await setupAgentSystem();

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Example 1: Execute a simple task
    await executeSimpleTask(system);

    // Example 2: Execute a workflow
    await executeWorkflow(system);

    // Example 3: Inter-agent communication
    await demonstrateInterAgentComm(system);

    // Example 4: Monitor the system
    setInterval(async () => {
      await monitorSystem(system);
    }, 30000); // Every 30 seconds

    // Keep running
    logger.info('Multi-agent system running. Press Ctrl+C to exit.');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down multi-agent system');

      // Stop agents
      for (const agent of system.agents) {
        await agent.stop();
        await agent.terminate();
      }

      // Close infrastructure
      await system.taskQueue.close();
      await system.workflowEngine.close();
      await system.messageBus.close();
      await system.registry.close();

      logger.info('Shutdown complete');
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, 'Fatal error in main');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  setupAgentSystem,
  createAgents,
  executeSimpleTask,
  executeWorkflow,
  demonstrateInterAgentComm,
  monitorSystem,
};
