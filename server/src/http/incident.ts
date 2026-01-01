// Incident Response HTTP API
// Provides REST endpoints for incident management and coordination

import express from 'express';
import { z } from 'zod';
import { createValidator } from '../middleware/request-validation.js';
import { incidentResponseEngine } from '../conductor/incident/response-engine';
import { runbookExecutor } from '../conductor/incident/runbook-executor';
import { warRoomCoordinator } from '../conductor/incident/war-room';

export const incidentRouter = express.Router();

const safeId = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9:_-]+$/, 'must contain only alphanumerics, colon, dash, or underscore');
const safeShortText = z.string().trim().min(1).max(256);
const safeLongText = z.string().trim().min(1).max(5000);

const createIncidentSchema = z
  .object({
    type: safeShortText,
    severity: z.enum(['P0', 'P1', 'P2', 'P3']),
    source: safeShortText.optional().default('manual'),
    title: safeShortText,
    description: z.string().trim().max(5000).optional().default(''),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .refine((meta) => !meta || Object.keys(meta).length <= 50, 'metadata cannot exceed 50 keys')
      .default({}),
  })
  .strict();

const incidentIdParamsSchema = z
  .object({
    id: safeId,
  })
  .strict();

const incidentQuerySchema = z
  .object({
    status: safeShortText.optional(),
    type: safeShortText.optional(),
    severity: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  })
  .strict();

const runbookExecutionSchema = z
  .object({
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .refine((ctx) => !ctx || Object.keys(ctx).length <= 100, 'context cannot exceed 100 entries')
      .default({}),
    executedBy: safeId,
    approvedBy: safeId.optional(),
  })
  .strict();

const runbookActionParamsSchema = z
  .object({
    id: safeId,
    action: z.enum(['pause', 'abort']),
  })
  .strict();

const warRoomIdParamsSchema = z
  .object({
    id: safeId,
  })
  .strict();

const runbookListQuerySchema = z
  .object({
    category: safeShortText.optional(),
    severity: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  })
  .strict();

const warRoomCreateSchema = z
  .object({
    incidentId: safeId,
    commander: safeId,
    incident: z
      .object({
        id: safeId,
        type: safeShortText.optional(),
        severity: z.enum(['P0', 'P1', 'P2', 'P3']).optional().default('P3'),
        source: safeShortText.optional().default('manual'),
        title: safeShortText.optional().default('Manual War Room Creation'),
        description: z.string().trim().max(2000).optional().default(''),
        metadata: z
          .record(z.string(), z.unknown())
          .optional()
          .default({}),
        timestamp: z.number().optional().default(() => Date.now()),
      })
      .strict()
      .optional(),
  })
  .strict();

const warRoomJoinSchema = z
  .object({
    userId: safeId,
    role: z.enum(['commander', 'responder', 'observer']).optional().default('responder'),
  })
  .strict();

const warRoomMessageSchema = z
  .object({
    userId: safeId,
    content: safeLongText,
    critical: z.boolean().optional().default(false),
  })
  .strict();

const warRoomDecisionSchema = z
  .object({
    userId: safeId,
    title: safeShortText,
    description: safeLongText,
    impact: safeShortText,
    rationale: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

const warRoomActionSchema = z
  .object({
    assignerUserId: safeId,
    assignedTo: safeId,
    title: safeShortText,
    description: safeLongText,
    priority: safeShortText,
    dueDate: z.string().trim().max(64).optional(),
    dependencies: z.array(safeId).max(25).optional().default([]),
    tags: z.array(safeShortText).max(25).optional().default([]),
  })
  .strict();

const warRoomResolutionSchema = z
  .object({
    commanderId: safeId,
    summary: safeLongText,
    rootCause: safeLongText,
    preventionMeasures: z.array(safeShortText).max(50).optional().default([]),
  })
  .strict();

const warRoomArtifactSchema = z
  .object({
    userId: safeId,
    type: safeShortText,
    name: safeShortText,
    url: z.string().trim().url().max(2048),
    tags: z.array(safeShortText).max(25).optional().default([]),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

const warRoomEscalationSchema = z
  .object({
    userId: safeId,
    reason: safeLongText,
    escalationLevel: safeShortText.optional().default('management'),
  })
  .strict();

/**
 * Create new incident
 */
incidentRouter.post(
  '/incidents',
  createValidator(createIncidentSchema),
  async (req, res) => {
    try {
      const { type, severity, source, title, description, metadata } =
        req.body as z.infer<typeof createIncidentSchema>;

      const incidentContext = {
        id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        source,
        title,
        description,
        metadata,
        timestamp: Date.now(),
      };

      const incidentId = await incidentResponseEngine.handleIncident(incidentContext);

      // Create war room for P0/P1 incidents
      let warRoomId: string | undefined;
      if (severity === 'P0' || severity === 'P1') {
        const commander = (req.headers['x-user-id'] as string) || 'system';
        warRoomId = await warRoomCoordinator.createWarRoom(
          incidentId,
          commander,
          incidentContext,
        );
      }

      res.status(201).json({
        incidentId,
        warRoomId,
        status: 'created',
        message: 'Incident created and response initiated',
      });
    } catch (error) {
      console.error('Incident creation error:', error);
      res.status(500).json({
        error: 'Failed to create incident',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Get incident details
 */
incidentRouter.get(
  '/incidents/:id',
  createValidator(incidentIdParamsSchema, { target: 'params' }),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof incidentIdParamsSchema>;

      // Get incident from Redis
      const redis = incidentResponseEngine['redis'];
      const incidentData = await redis.get(`incident:${id}`);

      if (!incidentData) {
        return res.status(404).json({
          error: 'Incident not found',
        });
      }

      const incident = JSON.parse(incidentData);
      res.json(incident);
    } catch (error) {
      console.error('Incident retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve incident',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * List active incidents
 */
incidentRouter.get(
  '/incidents',
  createValidator(incidentQuerySchema, { target: 'query' }),
  async (req, res) => {
    try {
      const { status, type, severity } = req.query as z.infer<typeof incidentQuerySchema>;
      const redis = incidentResponseEngine['redis'];

      // Get all incident keys
      const keys = await redis.keys('incident:*');
      const incidents = [];

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const incident = JSON.parse(data);

          // Apply filters
          if (status && incident.status !== status) continue;
          if (type && incident.context.type !== type) continue;
          if (severity && incident.context.severity !== severity) continue;

          incidents.push(incident);
        }
      }

      // Sort by timestamp (most recent first)
      incidents.sort((a, b) => b.context.timestamp - a.context.timestamp);

      res.json({
        incidents,
        total: incidents.length,
      });
    } catch (error) {
      console.error('Incident list error:', error);
      res.status(500).json({
        error: 'Failed to retrieve incidents',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Execute runbook
 */
incidentRouter.post(
  '/runbooks/:id/execute',
  createValidator(incidentIdParamsSchema, { target: 'params' }),
  createValidator(runbookExecutionSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof incidentIdParamsSchema>;
      const { context, executedBy, approvedBy } = req.body as z.infer<typeof runbookExecutionSchema>;

      const executionId = await runbookExecutor.executeRunbook(
        id,
        context,
        executedBy,
        approvedBy,
      );

      res.status(202).json({
        executionId,
        status: 'started',
        message: 'Runbook execution started',
      });
    } catch (error) {
      console.error('Runbook execution error:', error);
      res.status(500).json({
        error: 'Failed to execute runbook',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Get runbook execution status
 */
incidentRouter.get(
  '/runbooks/executions/:id',
  createValidator(incidentIdParamsSchema, { target: 'params' }),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof incidentIdParamsSchema>;
      const execution = runbookExecutor.getExecution(id);

      if (!execution) {
        return res.status(404).json({
          error: 'Execution not found',
        });
      }

      res.json(execution);
    } catch (error) {
      console.error('Execution retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve execution',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * List available runbooks
 */
incidentRouter.get(
  '/runbooks',
  createValidator(runbookListQuerySchema, { target: 'query' }),
  async (req, res) => {
    try {
      const runbooks = runbookExecutor.getRunbooks();

      // Filter by category if specified
      const { category, severity } = req.query as z.infer<typeof runbookListQuerySchema>;
      let filtered = runbooks;

      if (category) {
        filtered = filtered.filter((r) => r.category === category);
      }

      if (severity) {
        filtered = filtered.filter((r) => r.severity === severity);
      }

      res.json({
        runbooks: filtered,
        total: filtered.length,
      });
    } catch (error) {
      console.error('Runbook list error:', error);
      res.status(500).json({
        error: 'Failed to retrieve runbooks',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Control runbook execution
 */
incidentRouter.post(
  '/runbooks/executions/:id/:action',
  createValidator(runbookActionParamsSchema, { target: 'params' }),
  async (req, res) => {
    try {
      const { id, action } = req.params as z.infer<typeof runbookActionParamsSchema>;

      switch (action) {
        case 'pause':
          runbookExecutor.pauseExecution(id);
          res.json({ message: 'Execution paused' });
          break;

        case 'abort':
          runbookExecutor.abortExecution(id);
          res.json({ message: 'Execution aborted' });
          break;

        default:
          res.status(400).json({
            error: 'Invalid action',
            valid_actions: ['pause', 'abort'],
          });
      }
    } catch (error) {
      console.error('Execution control error:', error);
      res.status(500).json({
        error: 'Failed to control execution',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Create war room
 */
incidentRouter.post(
  '/war-rooms',
  createValidator(warRoomCreateSchema),
  async (req, res) => {
    try {
      const { incidentId, commander, incident } = req.body as z.infer<typeof warRoomCreateSchema>;

      const sessionId = await warRoomCoordinator.createWarRoom(
        incidentId,
        commander,
        incident || {
          id: incidentId,
          type: 'unknown',
          severity: 'P3',
          source: 'manual',
          title: 'Manual War Room Creation',
          description: '',
          metadata: {},
          timestamp: Date.now(),
        },
      );

      res.status(201).json({
        sessionId,
        warRoomUrl: `ws://localhost:8083?session=${sessionId}&user=${commander}`,
        status: 'created',
      });
    } catch (error) {
      console.error('War room creation error:', error);
      res.status(500).json({
        error: 'Failed to create war room',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Get war room details
 */
incidentRouter.get(
  '/war-rooms/:id',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const session = warRoomCoordinator.getSession(id);

      if (!session) {
        return res.status(404).json({
          error: 'War room not found',
        });
      }

      res.json(session);
    } catch (error) {
      console.error('War room retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve war room',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * List active war rooms
 */
incidentRouter.get('/war-rooms', async (req, res) => {
  try {
    const sessions = warRoomCoordinator.getActiveSessions();
    res.json({
      warRooms: sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('War room list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve war rooms',
      details: error.message,
    });
  }
});

/**
 * Join war room
 */
incidentRouter.post(
  '/war-rooms/:id/join',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomJoinSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { userId, role } = req.body as z.infer<typeof warRoomJoinSchema>;

      const success = await warRoomCoordinator.joinWarRoom(id, userId, role);

      if (!success) {
        return res.status(404).json({
          error: 'War room not found or not active',
        });
      }

      res.json({
        message: 'Joined war room successfully',
        warRoomUrl: `ws://localhost:8083?session=${id}&user=${userId}`,
      });
    } catch (error) {
      console.error('War room join error:', error);
      res.status(500).json({
        error: 'Failed to join war room',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Send message to war room
 */
incidentRouter.post(
  '/war-rooms/:id/messages',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomMessageSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { userId, content, critical } = req.body as z.infer<typeof warRoomMessageSchema>;

      await warRoomCoordinator.sendMessage(id, userId, content, critical);

      res.json({
        message: 'Message sent successfully',
      });
    } catch (error) {
      console.error('War room message error:', error);
      res.status(500).json({
        error: 'Failed to send message',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Make decision in war room
 */
incidentRouter.post(
  '/war-rooms/:id/decisions',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomDecisionSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { userId, title, description, impact, rationale } =
        req.body as z.infer<typeof warRoomDecisionSchema>;

      const decisionId = await warRoomCoordinator.makeDecision(id, userId, {
        title,
        description,
        impact,
        rationale,
        approved: false,
      });

      res.status(201).json({
        decisionId,
        message: 'Decision recorded successfully',
      });
    } catch (error) {
      console.error('War room decision error:', error);
      res.status(500).json({
        error: 'Failed to make decision',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Assign action item in war room
 */
incidentRouter.post(
  '/war-rooms/:id/actions',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomActionSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { assignerUserId, assignedTo, title, description, priority, dueDate, dependencies, tags } =
        req.body as z.infer<typeof warRoomActionSchema>;

      const actionId = await warRoomCoordinator.assignAction(id, assignerUserId, {
        assignedTo,
        title,
        description,
        priority,
        dueDate,
        dependencies,
        tags,
      });

      res.status(201).json({
        actionId,
        message: 'Action assigned successfully',
      });
    } catch (error) {
      console.error('War room action error:', error);
      res.status(500).json({
        error: 'Failed to assign action',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Resolve war room
 */
incidentRouter.post(
  '/war-rooms/:id/resolve',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomResolutionSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { commanderId, summary, rootCause, preventionMeasures } =
        req.body as z.infer<typeof warRoomResolutionSchema>;

      await warRoomCoordinator.resolveWarRoom(id, commanderId, {
        summary,
        rootCause,
        preventionMeasures,
      });

      res.json({
        message: 'War room resolved successfully',
      });
    } catch (error) {
      console.error('War room resolution error:', error);
      res.status(500).json({
        error: 'Failed to resolve war room',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Upload artifact to war room
 */
incidentRouter.post(
  '/war-rooms/:id/artifacts',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomArtifactSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { userId, type, name, url, tags, description } =
        req.body as z.infer<typeof warRoomArtifactSchema>;

      const artifactId = await warRoomCoordinator.uploadArtifact(id, userId, {
        type,
        name,
        url,
        tags,
        description,
      });

      res.status(201).json({
        artifactId,
        message: 'Artifact uploaded successfully',
      });
    } catch (error) {
      console.error('War room artifact error:', error);
      res.status(500).json({
        error: 'Failed to upload artifact',
        details: (error as Error).message,
      });
    }
  },
);

/**
 * Escalate incident from war room
 */
incidentRouter.post(
  '/war-rooms/:id/escalate',
  createValidator(warRoomIdParamsSchema, { target: 'params' }),
  createValidator(warRoomEscalationSchema),
  async (req, res) => {
    try {
      const { id } = req.params as z.infer<typeof warRoomIdParamsSchema>;
      const { userId, reason, escalationLevel } = req.body as z.infer<typeof warRoomEscalationSchema>;

      await warRoomCoordinator.escalateIncident(id, userId, reason, escalationLevel);

      res.json({
        message: 'Incident escalated successfully',
      });
    } catch (error) {
      console.error('War room escalation error:', error);
      res.status(500).json({
        error: 'Failed to escalate incident',
        details: (error as Error).message,
      });
    }
  },
);
