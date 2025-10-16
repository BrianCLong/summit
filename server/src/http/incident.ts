// Incident Response HTTP API
// Provides REST endpoints for incident management and coordination

import express from 'express';
import { incidentResponseEngine } from '../conductor/incident/response-engine';
import { runbookExecutor } from '../conductor/incident/runbook-executor';
import { warRoomCoordinator } from '../conductor/incident/war-room';

export const incidentRouter = express.Router();

/**
 * Create new incident
 */
incidentRouter.post('/incidents', async (req, res) => {
  try {
    const { type, severity, source, title, description, metadata } = req.body;

    if (!type || !severity || !title) {
      return res.status(400).json({
        error: 'Missing required fields: type, severity, title',
      });
    }

    const incidentContext = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      source: source || 'manual',
      title,
      description: description || '',
      metadata: metadata || {},
      timestamp: Date.now(),
    };

    const incidentId =
      await incidentResponseEngine.handleIncident(incidentContext);

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
      details: error.message,
    });
  }
});

/**
 * Get incident details
 */
incidentRouter.get('/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
      details: error.message,
    });
  }
});

/**
 * List active incidents
 */
incidentRouter.get('/incidents', async (req, res) => {
  try {
    const { status, type, severity } = req.query;
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
      details: error.message,
    });
  }
});

/**
 * Execute runbook
 */
incidentRouter.post('/runbooks/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { context, executedBy, approvedBy } = req.body;

    if (!executedBy) {
      return res.status(400).json({
        error: 'executedBy is required',
      });
    }

    const executionId = await runbookExecutor.executeRunbook(
      id,
      context || {},
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
      details: error.message,
    });
  }
});

/**
 * Get runbook execution status
 */
incidentRouter.get('/runbooks/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      details: error.message,
    });
  }
});

/**
 * List available runbooks
 */
incidentRouter.get('/runbooks', async (req, res) => {
  try {
    const runbooks = runbookExecutor.getRunbooks();

    // Filter by category if specified
    const { category, severity } = req.query;
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
      details: error.message,
    });
  }
});

/**
 * Control runbook execution
 */
incidentRouter.post('/runbooks/executions/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;

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
      details: error.message,
    });
  }
});

/**
 * Create war room
 */
incidentRouter.post('/war-rooms', async (req, res) => {
  try {
    const { incidentId, commander, incident } = req.body;

    if (!incidentId || !commander) {
      return res.status(400).json({
        error: 'Missing required fields: incidentId, commander',
      });
    }

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
      details: error.message,
    });
  }
});

/**
 * Get war room details
 */
incidentRouter.get('/war-rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      details: error.message,
    });
  }
});

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
incidentRouter.post('/war-rooms/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'responder' } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

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
      details: error.message,
    });
  }
});

/**
 * Send message to war room
 */
incidentRouter.post('/war-rooms/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, critical = false } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        error: 'userId and content are required',
      });
    }

    await warRoomCoordinator.sendMessage(id, userId, content, critical);

    res.json({
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('War room message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message,
    });
  }
});

/**
 * Make decision in war room
 */
incidentRouter.post('/war-rooms/:id/decisions', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, title, description, impact, rationale } = req.body;

    if (!userId || !title || !description || !impact) {
      return res.status(400).json({
        error: 'Missing required fields: userId, title, description, impact',
      });
    }

    const decisionId = await warRoomCoordinator.makeDecision(id, userId, {
      title,
      description,
      impact,
      rationale: rationale || '',
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
      details: error.message,
    });
  }
});

/**
 * Assign action item in war room
 */
incidentRouter.post('/war-rooms/:id/actions', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assignerUserId,
      assignedTo,
      title,
      description,
      priority,
      dueDate,
      dependencies,
      tags,
    } = req.body;

    if (!assignerUserId || !assignedTo || !title || !description || !priority) {
      return res.status(400).json({
        error:
          'Missing required fields: assignerUserId, assignedTo, title, description, priority',
      });
    }

    const actionId = await warRoomCoordinator.assignAction(id, assignerUserId, {
      assignedTo,
      title,
      description,
      priority,
      dueDate,
      dependencies: dependencies || [],
      tags: tags || [],
    });

    res.status(201).json({
      actionId,
      message: 'Action assigned successfully',
    });
  } catch (error) {
    console.error('War room action error:', error);
    res.status(500).json({
      error: 'Failed to assign action',
      details: error.message,
    });
  }
});

/**
 * Resolve war room
 */
incidentRouter.post('/war-rooms/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { commanderId, summary, rootCause, preventionMeasures } = req.body;

    if (!commanderId || !summary || !rootCause) {
      return res.status(400).json({
        error: 'Missing required fields: commanderId, summary, rootCause',
      });
    }

    await warRoomCoordinator.resolveWarRoom(id, commanderId, {
      summary,
      rootCause,
      preventionMeasures: preventionMeasures || [],
    });

    res.json({
      message: 'War room resolved successfully',
    });
  } catch (error) {
    console.error('War room resolution error:', error);
    res.status(500).json({
      error: 'Failed to resolve war room',
      details: error.message,
    });
  }
});

/**
 * Upload artifact to war room
 */
incidentRouter.post('/war-rooms/:id/artifacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, type, name, url, tags, description } = req.body;

    if (!userId || !type || !name || !url) {
      return res.status(400).json({
        error: 'Missing required fields: userId, type, name, url',
      });
    }

    const artifactId = await warRoomCoordinator.uploadArtifact(id, userId, {
      type,
      name,
      url,
      tags: tags || [],
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
      details: error.message,
    });
  }
});

/**
 * Escalate incident from war room
 */
incidentRouter.post('/war-rooms/:id/escalate', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason, escalationLevel = 'management' } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: userId, reason',
      });
    }

    await warRoomCoordinator.escalateIncident(
      id,
      userId,
      reason,
      escalationLevel,
    );

    res.json({
      message: 'Incident escalated successfully',
    });
  } catch (error) {
    console.error('War room escalation error:', error);
    res.status(500).json({
      error: 'Failed to escalate incident',
      details: error.message,
    });
  }
});
