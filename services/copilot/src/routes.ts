/**
 * Copilot API Routes
 *
 * REST API endpoints for the NL to Query copilot:
 * - POST /copilot/preview - Generate a draft query from natural language
 * - POST /copilot/execute - Execute a confirmed draft query
 * - GET /copilot/draft/:id - Get a specific draft
 * - GET /copilot/drafts - Get user's drafts
 * - DELETE /copilot/draft/:id - Delete a draft
 * - GET /copilot/health - Health check
 */

import { Router, Request, Response, NextFunction } from 'express';
import type {
  PreviewRequest,
  PreviewResponse,
  ExecuteAPIRequest,
  ExecuteAPIResponse,
  ErrorResponse,
  UserContext,
  GraphSchemaDescription,
  PolicyContext,
  QueryDialect,
} from './types.js';
import type { CopilotService } from './CopilotService.js';

// =============================================================================
// Route Configuration
// =============================================================================

export interface CopilotRouterConfig {
  copilotService: CopilotService;
  getUser: (req: Request) => UserContext;
  getSchema: (schemaContextId?: string) => GraphSchemaDescription;
  getPolicy: (policyContextId?: string, user?: UserContext) => PolicyContext;
}

// =============================================================================
// Default Schema and Policy (for development)
// =============================================================================

const DEFAULT_SCHEMA: GraphSchemaDescription = {
  nodeTypes: [
    {
      name: 'Person',
      labels: ['Entity', 'Person'],
      fields: [
        { name: 'id', type: 'id' },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'confidence', type: 'number' },
        { name: 'createdAt', type: 'datetime' },
      ],
    },
    {
      name: 'Organization',
      labels: ['Entity', 'Organization'],
      fields: [
        { name: 'id', type: 'id' },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'industry', type: 'string' },
      ],
    },
    {
      name: 'Location',
      labels: ['Entity', 'Location'],
      fields: [
        { name: 'id', type: 'id' },
        { name: 'name', type: 'string' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
      ],
    },
  ],
  edgeTypes: [
    {
      name: 'WORKS_FOR',
      from: 'Person',
      to: 'Organization',
      fields: [
        { name: 'role', type: 'string' },
        { name: 'startDate', type: 'datetime' },
      ],
    },
    {
      name: 'COMMUNICATES_WITH',
      from: 'Person',
      to: 'Person',
      fields: [
        { name: 'method', type: 'string' },
        { name: 'frequency', type: 'string' },
      ],
    },
    {
      name: 'LOCATED_AT',
      from: 'Entity',
      to: 'Location',
      fields: [],
    },
  ],
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_POLICY: PolicyContext = {
  maxDepth: 6,
  maxRows: 100,
  maxExecutionTimeMs: 30000,
  disallowedLabels: ['SensitivePerson', 'ClassifiedOrg'],
  disallowedNodeTypes: [],
  disallowedEdgeTypes: [],
  restrictedSensitivityLevels: ['TOP_SECRET'],
  allowedOperations: ['READ', 'AGGREGATE', 'PATH_FIND', 'CENTRALITY'],
  deniedOperations: ['CREATE', 'UPDATE', 'DELETE', 'MERGE'],
};

// =============================================================================
// Router Factory
// =============================================================================

export function createCopilotRouter(config: CopilotRouterConfig): Router {
  const router = Router();
  const { copilotService, getUser, getSchema, getPolicy } = config;

  // ---------------------------------------------------------------------------
  // POST /copilot/preview - Generate draft query
  // ---------------------------------------------------------------------------

  router.post(
    '/preview',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as PreviewRequest;

        // Validate required fields
        if (!body.userText || typeof body.userText !== 'string') {
          const error: ErrorResponse = {
            error: {
              code: 'INVALID_REQUEST',
              message: 'userText is required and must be a string',
            },
          };
          return res.status(400).json(error);
        }

        // Get user context (from auth middleware in production)
        const user = getUser(req);

        // Get schema and policy contexts
        const schema = getSchema(body.schemaContextId);
        const policy = getPolicy(body.policyContextId, user);

        // Generate draft query
        const draft = await copilotService.nlToQueryDraft({
          userText: body.userText.trim(),
          user,
          schema,
          policy,
          dialect: body.dialect as QueryDialect,
          investigationId: body.investigationId,
          conversationId: body.conversationId,
        });

        const response: PreviewResponse = { draft };
        return res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /copilot/execute - Execute confirmed draft
  // ---------------------------------------------------------------------------

  router.post(
    '/execute',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as ExecuteAPIRequest;

        // Validate required fields
        if (!body.draftId || typeof body.draftId !== 'string') {
          const error: ErrorResponse = {
            error: {
              code: 'INVALID_REQUEST',
              message: 'draftId is required and must be a string',
            },
          };
          return res.status(400).json(error);
        }

        if (typeof body.confirm !== 'boolean') {
          const error: ErrorResponse = {
            error: {
              code: 'INVALID_REQUEST',
              message: 'confirm is required and must be a boolean',
            },
          };
          return res.status(400).json(error);
        }

        // Get user context
        const user = getUser(req);
        const policy = getPolicy(undefined, user);

        // Execute the query
        const result = await copilotService.executeQuery(
          {
            draftId: body.draftId,
            confirm: body.confirm,
            overrideSafety: body.overrideSafety,
            reason: body.reason,
          },
          user,
          policy,
        );

        const response: ExecuteAPIResponse = result;
        return res.status(200).json(response);
      } catch (error) {
        // Handle specific error types
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            const errorResponse: ErrorResponse = {
              error: {
                code: 'NOT_FOUND',
                message: error.message,
              },
            };
            return res.status(404).json(errorResponse);
          }

          if (
            error.message.includes('confirmation required') ||
            error.message.includes('safety checks') ||
            error.message.includes('Policy denied') ||
            error.message.includes('permission')
          ) {
            const errorResponse: ErrorResponse = {
              error: {
                code: 'FORBIDDEN',
                message: error.message,
              },
            };
            return res.status(403).json(errorResponse);
          }

          if (error.message.includes('expired')) {
            const errorResponse: ErrorResponse = {
              error: {
                code: 'EXPIRED',
                message: error.message,
              },
            };
            return res.status(410).json(errorResponse);
          }
        }

        next(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /copilot/draft/:id - Get specific draft
  // ---------------------------------------------------------------------------

  router.get(
    '/draft/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const user = getUser(req);

        const draft = await copilotService.getDraft(id);

        if (!draft) {
          const error: ErrorResponse = {
            error: {
              code: 'NOT_FOUND',
              message: `Draft not found: ${id}`,
            },
          };
          return res.status(404).json(error);
        }

        // Check ownership (in production, also check tenant)
        if (draft.createdBy !== user.userId) {
          const error: ErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this draft',
            },
          };
          return res.status(403).json(error);
        }

        return res.status(200).json({ draft });
      } catch (error) {
        next(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /copilot/drafts - Get user's drafts
  // ---------------------------------------------------------------------------

  router.get(
    '/drafts',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = getUser(req);
        const limit = Math.min(
          parseInt(req.query.limit as string, 10) || 10,
          50,
        );

        const drafts = await copilotService.getUserDrafts(user.userId, limit);

        return res.status(200).json({ drafts });
      } catch (error) {
        next(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // DELETE /copilot/draft/:id - Delete a draft
  // ---------------------------------------------------------------------------

  router.delete(
    '/draft/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const user = getUser(req);

        // Get draft to check ownership
        const draft = await copilotService.getDraft(id);

        if (!draft) {
          const error: ErrorResponse = {
            error: {
              code: 'NOT_FOUND',
              message: `Draft not found: ${id}`,
            },
          };
          return res.status(404).json(error);
        }

        // Check ownership
        if (draft.createdBy !== user.userId) {
          const error: ErrorResponse = {
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to delete this draft',
            },
          };
          return res.status(403).json(error);
        }

        await copilotService.deleteDraft(id);

        return res.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /copilot/health - Health check
  // ---------------------------------------------------------------------------

  router.get(
    '/health',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const health = await copilotService.healthCheck();

        const statusCode = health.healthy ? 200 : 503;
        return res.status(statusCode).json(health);
      } catch (error) {
        next(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Error Handler Middleware
  // ---------------------------------------------------------------------------

  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Copilot API Error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };

    return res.status(500).json(errorResponse);
  });

  return router;
}

// =============================================================================
// Helper: Create Default User Context (for development)
// =============================================================================

export function createDefaultUserContext(req: Request): UserContext {
  // In production, this would extract user from JWT/session
  // For development, use headers or defaults

  const userId = (req.headers['x-user-id'] as string) || 'dev-user-001';
  const tenantId = (req.headers['x-tenant-id'] as string) || 'dev-tenant';
  const roles = ((req.headers['x-user-roles'] as string) || 'ANALYST').split(',');
  const clearances = ((req.headers['x-user-clearances'] as string) || 'UNCLASSIFIED,CONFIDENTIAL').split(',');

  return {
    userId,
    tenantId,
    roles,
    clearances,
    sessionId: req.headers['x-session-id'] as string,
  };
}

// =============================================================================
// Helper: Create Default Schema/Policy Context Resolvers
// =============================================================================

export function createDefaultSchemaResolver(): (schemaContextId?: string) => GraphSchemaDescription {
  // In production, this could load from database or configuration
  return (schemaContextId?: string) => {
    // Could load different schemas based on contextId
    return DEFAULT_SCHEMA;
  };
}

export function createDefaultPolicyResolver(): (
  policyContextId?: string,
  user?: UserContext,
) => PolicyContext {
  return (policyContextId?: string, user?: UserContext) => {
    // Could customize policy based on user roles/clearances
    const policy = { ...DEFAULT_POLICY };

    // Example: Increase limits for supervisors
    if (user?.roles.includes('SUPERVISOR') || user?.roles.includes('ADMIN')) {
      policy.maxRows = 500;
      policy.maxDepth = 8;
    }

    // Example: Allow more sensitive data for higher clearances
    if (user?.clearances.includes('SECRET') || user?.clearances.includes('TOP_SECRET')) {
      policy.restrictedSensitivityLevels = [];
    }

    return policy;
  };
}
