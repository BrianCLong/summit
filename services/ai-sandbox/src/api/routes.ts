import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  ExperimentRequestSchema,
  SandboxEnvironmentSchema,
  DeploymentRequestSchema,
  ResourceQuotasSchema,
} from '../types.js';
import type { TaskQueue } from '../queue/TaskQueue.js';
import { PolicyEngine } from '../sandbox/PolicyEngine.js';
import { logger } from '../utils/logger.js';
import { registry } from '../utils/metrics.js';

export async function registerRoutes(
  app: FastifyInstance,
  taskQueue: TaskQueue,
): Promise<void> {
  const policyEngine = new PolicyEngine();

  // In-memory environment store (replace with DB in production)
  const environments = new Map();

  // Health check
  app.get('/health', async () => ({
    status: 'healthy',
    service: 'ai-sandbox',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async () => {
    const stats = await taskQueue.getQueueStats();
    return {
      status: 'ready',
      queue: stats,
    };
  });

  // Metrics endpoint
  app.get('/metrics', async (_, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });

  // === Environment Management ===

  // Create sandbox environment
  app.post('/api/v1/environments', async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    const environmentData = {
      id: randomUUID(),
      name: body.name,
      description: body.description,
      agencyId: body.agencyId,
      complianceFrameworks: body.complianceFrameworks || ['FEDRAMP_MODERATE'],
      resourceQuotas: ResourceQuotasSchema.parse(body.resourceQuotas || {}),
      allowedModules: body.allowedModules || [],
      blockedModules: body.blockedModules || [],
      networkAllowlist: body.networkAllowlist || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt as string) : undefined,
      status: 'active' as const,
    };

    const environment = SandboxEnvironmentSchema.parse(environmentData);
    environments.set(environment.id, environment);

    logger.info({ environmentId: environment.id }, 'Sandbox environment created');

    reply.code(201);
    return environment;
  });

  // Get environment
  app.get('/api/v1/environments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const environment = environments.get(id);

    if (!environment) {
      reply.code(404);
      return { error: 'Environment not found' };
    }

    return environment;
  });

  // List environments
  app.get('/api/v1/environments', async (request) => {
    const { agencyId } = request.query as { agencyId?: string };

    let envList = Array.from(environments.values());
    if (agencyId) {
      envList = envList.filter((e) => e.agencyId === agencyId);
    }

    return { environments: envList, total: envList.length };
  });

  // === Experiment Management ===

  // Submit experiment
  app.post('/api/v1/experiments', async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    // Validate request
    let experimentRequest;
    try {
      experimentRequest = ExperimentRequestSchema.parse(body);
    } catch (error) {
      reply.code(400);
      return { error: 'Invalid experiment request', details: error };
    }

    // Get environment
    const environment = environments.get(experimentRequest.environmentId);
    if (!environment) {
      reply.code(404);
      return { error: 'Sandbox environment not found' };
    }

    // Evaluate policy
    const policyDecision = await policyEngine.evaluate(environment, experimentRequest);

    if (!policyDecision.allowed) {
      reply.code(403);
      return {
        error: 'Policy violation',
        reason: policyDecision.reason,
        violations: policyDecision.violations,
        recommendations: policyDecision.recommendations,
      };
    }

    // Submit to queue
    const taskId = await taskQueue.submit({
      request: experimentRequest,
      environmentConfig: {
        resourceQuotas: environment.resourceQuotas,
        complianceFrameworks: environment.complianceFrameworks,
      },
      submittedBy: (request.headers['x-user-id'] as string) || 'anonymous',
    });

    reply.code(202);
    return {
      taskId,
      status: 'pending',
      policyWarnings: policyDecision.violations.filter(
        (v) => v.severity !== 'critical',
      ),
      recommendations: policyDecision.recommendations,
    };
  });

  // Get experiment result
  app.get('/api/v1/experiments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await taskQueue.getResult(id);

    if (!result) {
      reply.code(404);
      return { error: 'Experiment not found' };
    }

    return result;
  });

  // Get experiment status (lightweight)
  app.get('/api/v1/experiments/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await taskQueue.getResult(id);

    if (!result) {
      reply.code(404);
      return { error: 'Experiment not found' };
    }

    return {
      id: result.id,
      experimentId: result.experimentId,
      status: result.status,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    };
  });

  // === Fast-Track Deployment ===

  // Request deployment
  app.post('/api/v1/deployments', async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    let deploymentRequest;
    try {
      deploymentRequest = DeploymentRequestSchema.parse(body);
    } catch (error) {
      reply.code(400);
      return { error: 'Invalid deployment request', details: error };
    }

    // Verify experiment completed successfully
    const experiment = await taskQueue.getResult(deploymentRequest.experimentId);
    if (!experiment) {
      reply.code(404);
      return { error: 'Experiment not found' };
    }

    if (experiment.status !== 'completed') {
      reply.code(400);
      return { error: 'Experiment must be completed before deployment' };
    }

    if (!experiment.complianceReport?.passed) {
      reply.code(400);
      return {
        error: 'Experiment did not pass compliance checks',
        findings: experiment.complianceReport?.findings,
      };
    }

    // Verify approvals
    if (deploymentRequest.approvals.length < 2) {
      reply.code(400);
      return { error: 'At least 2 approvals required for deployment' };
    }

    // Validate deployment policy
    const deployPolicy = await policyEngine.validateDeployment(
      deploymentRequest.experimentId,
      deploymentRequest.targetEnvironment,
    );

    if (!deployPolicy.allowed) {
      reply.code(403);
      return {
        error: 'Deployment policy violation',
        violations: deployPolicy.violations,
      };
    }

    // Create deployment record
    const deployment = {
      id: randomUUID(),
      experimentId: deploymentRequest.experimentId,
      targetEnvironment: deploymentRequest.targetEnvironment,
      status: 'pending',
      config: deploymentRequest.deploymentConfig,
      approvals: deploymentRequest.approvals,
      createdAt: new Date(),
      recommendations: deployPolicy.recommendations,
    };

    logger.info(
      { deploymentId: deployment.id, target: deployment.targetEnvironment },
      'Deployment requested',
    );

    reply.code(202);
    return deployment;
  });

  // === Queue Statistics ===

  app.get('/api/v1/queue/stats', async () => {
    return taskQueue.getQueueStats();
  });
}
