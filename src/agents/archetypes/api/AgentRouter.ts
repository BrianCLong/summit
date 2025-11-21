/**
 * AgentRouter - Express router for agent archetype API endpoints
 *
 * Provides REST API endpoints for interacting with agent archetypes.
 * All endpoints require authentication and respect policy enforcement.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getAgentRegistry } from '../base/AgentRegistry';
import { createAgentLogger } from '../base/AgentLogger';
import {
  AgentContext,
  AgentQuery,
  AgentRole,
  ClassificationLevel,
} from '../base/types';
import {
  agentCommands,
  searchCommands,
  getCommandById,
  formatAgentResult,
} from '../ui/AgentCommands';

const logger = createAgentLogger('agent-api', 'info');

// Extended request with user context
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
  organization?: {
    id: string;
    name: string;
  };
}

// Middleware to validate agent role
const validateAgentRole = (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.params;
  const validRoles: AgentRole[] = ['chief_of_staff', 'coo', 'revops'];

  if (!validRoles.includes(role as AgentRole)) {
    return res.status(400).json({
      error: 'Invalid agent role',
      validRoles,
    });
  }

  next();
};

// Build AgentContext from request
const buildContext = (req: AuthenticatedRequest): AgentContext => {
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;

  return {
    user: req.user || {
      id: 'anonymous',
      name: 'Anonymous',
      email: '',
      roles: ['viewer'],
      permissions: ['read'],
    },
    organization: {
      id: req.organization?.id || 'default',
      name: req.organization?.name || 'Default',
      policies: {
        id: 'default_policy',
        version: '1.0',
        rules: [],
      },
      graphHandle: {
        query: async () => [],
        mutate: async () => ({}),
        getEntity: async () => null,
        createEntity: async (type, props) => ({
          id: `entity_${Date.now()}`,
          type,
          properties: props,
          relationships: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        updateEntity: async (id, props) => ({
          id,
          type: 'unknown',
          properties: props,
          relationships: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        deleteEntity: async () => true,
      },
    },
    mode: (req.query.mode as 'analysis' | 'recommendation' | 'action' | 'monitor') || 'analysis',
    timestamp: new Date(),
    requestId,
    classification: (req.headers['x-classification'] as ClassificationLevel) || 'UNCLASSIFIED',
    metadata: req.body.metadata,
  };
};

// Create the router
export function createAgentRouter(): Router {
  const router = Router();

  /**
   * GET /agents
   * List all available agents
   */
  router.get('/', (req: Request, res: Response) => {
    const registry = getAgentRegistry();
    const agents = registry.listAgents();

    res.json({
      agents,
      initialized: registry.isInitialized(),
    });
  });

  /**
   * GET /agents/status
   * Get status of all agents
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const registry = getAgentRegistry();
      const statusMap = registry.getStatusAll();

      const statuses: Record<string, any> = {};
      statusMap.forEach((status, role) => {
        statuses[role] = status;
      });

      res.json({ statuses });
    } catch (error) {
      logger.error('Failed to get agent statuses', error as Error);
      res.status(500).json({ error: 'Failed to get agent statuses' });
    }
  });

  /**
   * GET /agents/health
   * Health check for all agents
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const registry = getAgentRegistry();
      const healthMap = await registry.getHealthAll();

      const health: Record<string, any> = {};
      let allHealthy = true;

      healthMap.forEach((h, role) => {
        health[role] = h;
        if (!h.healthy) allHealthy = false;
      });

      res.json({
        healthy: allHealthy,
        agents: health,
      });
    } catch (error) {
      logger.error('Failed to get agent health', error as Error);
      res.status(500).json({ error: 'Failed to get agent health' });
    }
  });

  /**
   * GET /agents/commands
   * List all available commands
   */
  router.get('/commands', (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (query) {
      const results = searchCommands(query);
      res.json({ commands: results, total: results.length });
    } else {
      res.json({ commands: agentCommands, total: agentCommands.length });
    }
  });

  /**
   * GET /agents/:role
   * Get agent info by role
   */
  router.get('/:role', validateAgentRole, (req: Request, res: Response) => {
    const { role } = req.params;
    const registry = getAgentRegistry();
    const agent = registry.getAgent(role as AgentRole);

    if (!agent) {
      return res.status(404).json({ error: `Agent ${role} not found` });
    }

    res.json({
      name: agent.name,
      role: agent.role,
      capabilities: agent.capabilities,
      status: agent.getStatus(),
      metrics: agent.getMetrics(),
    });
  });

  /**
   * POST /agents/:role/execute
   * Execute an agent
   */
  router.post('/:role/execute', validateAgentRole, async (req: AuthenticatedRequest, res: Response) => {
    const { role } = req.params;
    const context = buildContext(req);

    logger.info(`Executing agent: ${role}`, { requestId: context.requestId });

    try {
      const registry = getAgentRegistry();
      const result = await registry.execute(role as AgentRole, context);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error(`Agent execution failed: ${role}`, error as Error, { requestId: context.requestId });
      res.status(500).json({
        requestId: context.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /agents/:role/analyze
   * Run analysis with specific query
   */
  router.post('/:role/analyze', validateAgentRole, async (req: AuthenticatedRequest, res: Response) => {
    const { role } = req.params;
    const { type, parameters, filters, timeframe } = req.body;
    const context = buildContext(req);

    const query: AgentQuery = {
      type,
      parameters: parameters || {},
      filters,
      timeframe: timeframe ? {
        start: new Date(timeframe.start),
        end: new Date(timeframe.end),
      } : undefined,
    };

    logger.info(`Running analysis: ${role}/${type}`, { requestId: context.requestId });

    try {
      const registry = getAgentRegistry();
      const agent = registry.getAgent(role as AgentRole);

      if (!agent) {
        return res.status(404).json({ error: `Agent ${role} not found` });
      }

      const analysis = await agent.analyze(query, context);
      res.json({ analysis });
    } catch (error) {
      logger.error(`Analysis failed: ${role}/${type}`, error as Error, { requestId: context.requestId });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /agents/commands/:commandId/execute
   * Execute a predefined command
   */
  router.post('/commands/:commandId/execute', async (req: AuthenticatedRequest, res: Response) => {
    const { commandId } = req.params;
    const context = buildContext(req);

    const command = getCommandById(commandId);

    if (!command) {
      return res.status(404).json({ error: `Command ${commandId} not found` });
    }

    logger.info(`Executing command: ${commandId}`, { requestId: context.requestId });

    try {
      const result = await command.execute(context);
      const formatted = formatAgentResult(result, commandId);

      res.json({
        result,
        formatted,
      });
    } catch (error) {
      logger.error(`Command execution failed: ${commandId}`, error as Error, { requestId: context.requestId });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /agents/:role/metrics
   * Get agent metrics
   */
  router.get('/:role/metrics', validateAgentRole, (req: Request, res: Response) => {
    const { role } = req.params;
    const registry = getAgentRegistry();
    const agent = registry.getAgent(role as AgentRole);

    if (!agent) {
      return res.status(404).json({ error: `Agent ${role} not found` });
    }

    res.json({ metrics: agent.getMetrics() });
  });

  /**
   * POST /agents/:role/metrics/reset
   * Reset agent metrics
   */
  router.post('/:role/metrics/reset', validateAgentRole, (req: Request, res: Response) => {
    const { role } = req.params;
    const registry = getAgentRegistry();
    const agent = registry.getAgent(role as AgentRole);

    if (!agent) {
      return res.status(404).json({ error: `Agent ${role} not found` });
    }

    agent.resetMetrics();
    res.json({ success: true, message: 'Metrics reset' });
  });

  /**
   * GET /agents/:role/health
   * Get agent health check
   */
  router.get('/:role/health', validateAgentRole, async (req: Request, res: Response) => {
    const { role } = req.params;
    const registry = getAgentRegistry();
    const agent = registry.getAgent(role as AgentRole);

    if (!agent) {
      return res.status(404).json({ error: `Agent ${role} not found` });
    }

    try {
      const health = await agent.getHealthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

// Export singleton router
export const agentRouter = createAgentRouter();
