/**
 * Agent Runtime Service
 * Executes YAML runbooks as DAGs with replay capability and KPI tracking
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import Redis from 'ioredis';
import Queue from 'bull';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import YAML from 'yaml';
import fs from 'fs/promises';
import path from 'path';
import { register, collectDefaultMetrics } from 'prom-client';

const PORT = parseInt(process.env.PORT || '4012');
const NODE_ENV = process.env.NODE_ENV || 'development';

const jsonRecord = () => z.record(z.string(), z.any());

// Prometheus metrics
collectDefaultMetrics();

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Task queue
const taskQueue = new Queue(
  'runbook-tasks',
  process.env.REDIS_URL || 'redis://localhost:6379',
);

// Schemas
const RunbookTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  uses: z.string(),
  with: jsonRecord().optional(),
  needs: z.array(z.string()).optional().default([]),
  timeout: z.number().optional().default(300),
  retries: z.number().optional().default(0),
});

const RunbookSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  tasks: z.array(RunbookTaskSchema),
  kpis: z.array(z.string()).optional().default([]),
  xai_notes: z.string().optional(),
});

const RunbookExecutionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  tasks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
      started_at: z.string().datetime().optional(),
      completed_at: z.string().datetime().optional(),
      output: jsonRecord().optional(),
      error: z.string().optional(),
    }),
  ),
  inputs: jsonRecord().optional(),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  kpis: jsonRecord().optional(),
  replay_source: z.string().optional(),
});

type Runbook = z.infer<typeof RunbookSchema>;
type RunbookTask = z.infer<typeof RunbookTaskSchema>;
type RunbookExecution = z.infer<typeof RunbookExecutionSchema>;

// Task executors
const taskExecutors: Record<
  string,
  (task: RunbookTask, inputs: any, context: any) => Promise<any>
> = {
  'connector:esri': async (task, inputs, context) => {
    // Mock ESRI connector
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      entities_ingested: 150,
      source: inputs.source || 'esri-default',
      timestamp: new Date().toISOString(),
    };
  },

  'connector:elastic': async (task, inputs, context) => {
    // Mock Elasticsearch connector
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      documents_ingested: 2500,
      indices: ['logs-*', 'metrics-*'],
      timestamp: new Date().toISOString(),
    };
  },

  'graph:entity-resolution': async (task, inputs, context) => {
    // Mock entity resolution
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      entities_resolved: 125,
      confidence_avg: 0.89,
      clusters_formed: 23,
      timestamp: new Date().toISOString(),
    };
  },

  'xai:explanations': async (task, inputs, context) => {
    // Mock XAI explanation generation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      explanations_generated: 125,
      avg_confidence: 0.92,
      counterfactuals: 45,
      timestamp: new Date().toISOString(),
    };
  },

  'export:bundle': async (task, inputs, context) => {
    // Mock export bundle creation
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      bundle_id: `bundle_${uuidv4()}`,
      artifacts: ['entities.json', 'relationships.json', 'explanations.json'],
      size_mb: 12.5,
      timestamp: new Date().toISOString(),
    };
  },

  'ml:forecast': async (task, inputs, context) => {
    // Mock forecasting
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return {
      forecast_horizon: inputs.horizon || 30,
      predictions: Array.from(
        { length: inputs.horizon || 30 },
        () => Math.random() * 100,
      ),
      confidence_intervals: Array.from({ length: inputs.horizon || 30 }, () => [
        0.8, 0.95,
      ]),
      timestamp: new Date().toISOString(),
    };
  },

  'analyze:risk': async (task, inputs, context) => {
    // Mock risk analysis
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      risk_score: Math.random() * 100,
      risk_factors: [
        'financial_anomaly',
        'network_centrality',
        'temporal_patterns',
      ],
      confidence: 0.87,
      timestamp: new Date().toISOString(),
    };
  },
};

// Runbook engine
class RunbookEngine {
  async loadRunbook(name: string, version?: string): Promise<Runbook> {
    try {
      const runbookPath = path.join(process.cwd(), 'RUNBOOKS', `${name}.yaml`);
      const content = await fs.readFile(runbookPath, 'utf8');
      const parsed = YAML.parse(content);
      return RunbookSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to load runbook ${name}: ${error}`);
    }
  }

  async executeRunbook(
    runbook: Runbook,
    inputs: any = {},
    replaySource?: string,
  ): Promise<RunbookExecution> {
    const executionId = uuidv4();
    const now = new Date().toISOString();

    const execution: RunbookExecution = {
      id: executionId,
      name: runbook.name,
      version: runbook.version,
      status: 'pending',
      tasks: runbook.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: 'pending',
      })),
      inputs,
      created_at: now,
      replay_source: replaySource,
    };

    // Store execution state
    await redis.set(`execution:${executionId}`, JSON.stringify(execution));

    // Add to queue for processing
    await taskQueue.add(
      'execute-runbook',
      {
        executionId,
        runbook,
        inputs,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return execution;
  }

  async getExecution(id: string): Promise<RunbookExecution | null> {
    const data = await redis.get(`execution:${id}`);
    if (!data) return null;

    return RunbookExecutionSchema.parse(JSON.parse(data));
  }

  async updateExecution(execution: RunbookExecution): Promise<void> {
    await redis.set(`execution:${execution.id}`, JSON.stringify(execution));
  }

  async replayExecution(
    sourceId: string,
    inputs?: any,
  ): Promise<RunbookExecution> {
    const sourceExecution = await this.getExecution(sourceId);
    if (!sourceExecution) {
      throw new Error(`Source execution not found: ${sourceId}`);
    }

    const runbook = await this.loadRunbook(
      sourceExecution.name,
      sourceExecution.version,
    );
    return this.executeRunbook(
      runbook,
      inputs || sourceExecution.inputs,
      sourceId,
    );
  }

  buildDAG(tasks: RunbookTask[]): Map<string, string[]> {
    const dag = new Map<string, string[]>();

    for (const task of tasks) {
      dag.set(task.id, task.needs || []);
    }

    return dag;
  }

  topologicalSort(dag: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    function visit(node: string) {
      if (temp.has(node)) {
        throw new Error('Circular dependency detected');
      }
      if (visited.has(node)) return;

      temp.add(node);
      const dependencies = dag.get(node) || [];
      dependencies.forEach(visit);
      temp.delete(node);
      visited.add(node);
      result.push(node);
    }

    for (const node of dag.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return result;
  }
}

const engine = new RunbookEngine();

// Task processor
taskQueue.process('execute-runbook', 5, async (job) => {
  const { executionId, runbook, inputs } = job.data;

  try {
    const execution = await engine.getExecution(executionId);
    if (!execution) throw new Error('Execution not found');

    // Update status to running
    execution.status = 'running';
    execution.started_at = new Date().toISOString();
    await engine.updateExecution(execution);

    // Build DAG and sort tasks
    const dag = engine.buildDAG(runbook.tasks);
    const sortedTaskIds = engine.topologicalSort(dag);

    const taskMap = new Map(runbook.tasks.map((t) => [t.id, t]));
    const results = new Map<string, any>();

    // Execute tasks in topological order
    for (const taskId of sortedTaskIds) {
      const task = taskMap.get(taskId) as RunbookTask;
      if (!task) continue;

      // Update task status
      const taskExecution = execution.tasks.find((t) => t.id === taskId);
      if (!taskExecution) continue;

      taskExecution.status = 'running';
      taskExecution.started_at = new Date().toISOString();
      await engine.updateExecution(execution);

      try {
        // Collect inputs from dependencies
        const taskInputs = { ...inputs, ...(task.with || {}) };
        for (const depId of task.needs || []) {
          taskInputs[`${depId}_output`] = results.get(depId);
        }

        // Execute task
        const executor = taskExecutors[task.uses] as any;
        if (!executor) {
          throw new Error(`Unknown task type: ${task.uses}`);
        }

        const output = await executor(task, taskInputs, {
          executionId,
          replaySource: execution.replay_source,
        });

        results.set(taskId, output);

        // Update task completion
        taskExecution.status = 'completed';
        taskExecution.completed_at = new Date().toISOString();
        taskExecution.output = output;
        await engine.updateExecution(execution);
      } catch (error) {
        taskExecution.status = 'failed';
        taskExecution.completed_at = new Date().toISOString();
        taskExecution.error = (error as Error).message;
        await engine.updateExecution(execution);

        // Fail entire execution
        execution.status = 'failed';
        execution.completed_at = new Date().toISOString();
        await engine.updateExecution(execution);
        throw error;
      }
    }

    // Calculate KPIs
    const kpis: Record<string, any> = {};
    const startTime = new Date(execution.started_at!).getTime();
    const endTime = Date.now();

    kpis.total_duration_ms = endTime - startTime;
    kpis.tasks_completed = execution.tasks.filter(
      (t) => t.status === 'completed',
    ).length;
    kpis.success_rate = kpis.tasks_completed / execution.tasks.length;

    // Add runbook-specific KPIs
    if (runbook.kpis?.includes('time_to_first_path')) {
      const firstPath = execution.tasks.find((t) =>
        t.name.includes('entity-resolution'),
      );
      if (firstPath?.completed_at && execution.started_at) {
        kpis.time_to_first_path_ms =
          new Date(firstPath.completed_at).getTime() -
          new Date(execution.started_at).getTime();
      }
    }

    if (runbook.kpis?.includes('provenance_coverage')) {
      // Mock provenance coverage calculation
      kpis.provenance_coverage = 0.95;
    }

    // Complete execution
    execution.status = 'completed';
    execution.completed_at = new Date().toISOString();
    execution.kpis = kpis;
    await engine.updateExecution(execution);
  } catch (error) {
    console.error('Runbook execution failed:', error);
    throw error;
  }
});

// Policy enforcement
async function policyMiddleware(request: any, reply: any) {
  const authorityId = request.headers['x-authority-id'];
  const reasonForAccess = request.headers['x-reason-for-access'];

  if (!authorityId || !reasonForAccess) {
    const dryRun = process.env.POLICY_DRY_RUN === 'true';

    if (dryRun) {
      request.log.warn('Policy violation in dry-run mode');
      return;
    }

    return reply.status(403).send({
      error: 'Policy denial',
      reason: 'Missing authority binding or reason-for-access',
      appealPath: '/ombudsman/appeals',
    });
  }

  request.authorityId = authorityId;
  request.reasonForAccess = reasonForAccess;
}

// Create Fastify instance
const server = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

// Register plugins
server.register(helmet);
server.register(cors);
server.register(websocket);

// Add policy middleware
server.addHook('preHandler', policyMiddleware);

// Health check
server.get('/health', async () => {
  try {
    await redis.ping();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        redis: 'healthy',
        queue: 'healthy',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: 'unhealthy',
      },
    };
  }
});

// Get runbook execution
server.get<{ Params: { id: string } }>(
  '/runbooks/:id',
  async (request, reply) => {
    const execution = await engine.getExecution(request.params.id);
    if (!execution) {
      reply.status(404);
      return { error: 'Runbook execution not found' };
    }
    return execution;
  },
);

// List runbook executions
server.get<{ Querystring: { status?: string } }>(
  '/runbooks',
  async (request) => {
    const keys = await redis.keys('execution:*');
    const executions = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      }),
    );

    let filtered = executions.filter(Boolean);

    if (request.query.status) {
      filtered = filtered.filter((e) => e.status === request.query.status);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  },
);

// Start runbook execution
server.post<{ Body: { name: string; version?: string; inputs?: any } }>(
  '/runbooks',
  async (request, reply) => {
    try {
      const { name, version, inputs } = request.body;

      const runbook = await engine.loadRunbook(name, version);
      const execution = await engine.executeRunbook(runbook, inputs);

      return execution;
    } catch (error) {
      server.log.error(error, 'Failed to start runbook');
      reply.status(500);
      return { error: 'Failed to start runbook execution' };
    }
  },
);

// Replay runbook execution
server.post<{ Body: { sourceId: string; inputs?: any } }>(
  '/runbooks/replay',
  async (request, reply) => {
    try {
      const { sourceId, inputs } = request.body;
      const execution = await engine.replayExecution(sourceId, inputs);
      return execution;
    } catch (error) {
      server.log.error(error, 'Failed to replay runbook');
      reply.status(500);
      return { error: 'Failed to replay runbook execution' };
    }
  },
);

// WebSocket for real-time updates
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.on('message', (message) => {
      const data = JSON.parse(message.toString());

      if (data.type === 'subscribe' && data.executionId) {
        // Subscribe to execution updates
        const interval = setInterval(async () => {
          const execution = await engine.getExecution(data.executionId);
          if (execution) {
            connection.send(
              JSON.stringify({
                type: 'execution_update',
                data: execution,
              }),
            );

            if (
              ['completed', 'failed', 'cancelled'].includes(execution.status)
            ) {
              clearInterval(interval);
            }
          }
        }, 1000);

        connection.on('close', () => {
          clearInterval(interval);
        });
      }
    });
  });
});

// Metrics endpoint
server.get('/metrics', async () => {
  return register.metrics();
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`🤖 Agent Runtime ready at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
