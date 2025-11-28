/**
 * Mobile Facade API Router
 * Provides optimized endpoints for the mobile field ops client
 * No new backend behaviors - facades existing APIs
 */
import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// Middleware to validate device binding
async function validateDevice(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(401).json({ error: 'Device ID required' });
  }

  // Verify device is registered and not revoked
  // In production, this would check against device registry
  const isValid = true; // Placeholder

  if (!isValid) {
    return res.status(403).json({ error: 'Device not authorized', shouldWipe: true });
  }

  next();
}

// Apply device validation to all mobile routes
router.use(validateDevice);

/**
 * GET /api/mobile/cases/assigned
 * Get cases assigned to the authenticated user
 * Optimized for mobile with pagination and minimal payload
 */
router.get('/cases/assigned', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { limit = 20, offset = 0 } = req.query;

    // Facade: Would call case service internally
    // Returns only fields needed for mobile list view
    const cases = [
      // Mock response structure
      {
        id: 'case-1',
        title: 'Sample Case',
        status: 'open',
        priority: 'high',
        assignedTo: [userId],
        summary: 'Case summary...',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        entityCount: 5,
        alertCount: 2,
        keyEntities: [
          { id: 'e1', type: 'person', name: 'John Doe', thumbnailUrl: null },
        ],
      },
    ];

    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

/**
 * GET /api/mobile/cases/:id
 * Get detailed case info for mobile view
 */
router.get('/cases/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Facade: Would call case service
    const caseData = {
      id,
      title: 'Case Title',
      status: 'open',
      priority: 'high',
      summary: 'Detailed case summary...',
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      entityCount: 10,
      alertCount: 3,
      keyEntities: [],
      mapSnapshot: null,
      lastBrief: null,
    };

    res.json(caseData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

/**
 * GET /api/mobile/alerts
 * Get alerts for the authenticated user
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { unread } = req.query;

    // Facade: Would call alert service
    const alerts = [
      {
        id: 'alert-1',
        type: 'new_intelligence',
        title: 'New Intel Available',
        message: 'New intelligence report published',
        severity: 'info',
        caseId: 'case-1',
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ];

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * GET /api/mobile/tasks
 * Get tasks assigned to the user
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Facade: Would call task service
    const tasks = [
      {
        id: 'task-1',
        title: 'Review Entity Updates',
        description: 'Review recent entity changes',
        caseId: 'case-1',
        assignedTo: userId,
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/mobile/tasks/pending
 * Get pending tasks only
 */
router.get('/tasks/pending', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const tasks = []; // Filter for pending/in_progress only
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/mobile/entities/:id
 * Get entity details with photos and provenance
 */
router.get('/entities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Facade: Would call entity service
    const entity = {
      id,
      type: 'person',
      name: 'Entity Name',
      attributes: {},
      photos: [],
      provenance: {
        sources: ['Source A', 'Source B'],
        confidence: 0.85,
        chain: [],
      },
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    res.json(entity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

/**
 * POST /api/mobile/notes
 * Create a new note (synced from mobile)
 */
router.post('/notes', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { localId, caseId, entityId, alertId, content, version } = req.body;

    // Check for conflicts
    const existingNote = null; // Would check by localId

    if (existingNote) {
      // Return conflict status with server version
      return res.status(409).json({
        error: 'Conflict',
        data: existingNote,
        version: 2,
        updatedAt: new Date().toISOString(),
      });
    }

    // Create note
    const note = {
      id: `note-${Date.now()}`,
      localId,
      caseId,
      entityId,
      alertId,
      content,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      version: 1,
    };

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/mobile/notes
 * Update an existing note
 */
router.put('/notes', async (req: Request, res: Response) => {
  try {
    const { id, content, version } = req.body;

    // Would update note and handle version conflicts
    res.json({ id, content, version: version + 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * POST /api/mobile/observations
 * Create a new observation
 */
router.post('/observations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { localId, caseId, type, data, location, timestamp, version } = req.body;

    const observation = {
      id: `obs-${Date.now()}`,
      localId,
      caseId,
      type,
      data,
      location,
      timestamp,
      createdBy: userId,
      version: 1,
    };

    res.status(201).json(observation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create observation' });
  }
});

/**
 * POST /api/mobile/attachments
 * Upload an attachment (photo/audio)
 */
router.post('/attachments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { localId, type, filename, mimeType, size, caseId, entityId, fileData } = req.body;

    // Would process and store the file
    // In production, use multipart upload or presigned URLs

    const attachment = {
      id: `att-${Date.now()}`,
      localId,
      type,
      filename,
      mimeType,
      size,
      caseId,
      entityId,
      remoteUrl: `/attachments/att-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
    };

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

/**
 * POST /api/mobile/acknowledgements
 * Record alert/task acknowledgements
 */
router.post('/acknowledgements', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { alertId, taskId, type, status, timestamp } = req.body;

    // Would update the alert/task status in respective service
    res.status(201).json({
      id: `ack-${Date.now()}`,
      alertId,
      taskId,
      type,
      status,
      timestamp,
      userId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record acknowledgement' });
  }
});

/**
 * GET /api/mobile/copilot/summary/:caseId
 * Get AI-generated case summary
 */
router.get('/copilot/summary/:caseId', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;

    // Facade: Would call copilot service
    const summary = {
      caseId,
      summary: 'AI-generated summary of key developments...',
      keyFindings: ['Finding 1', 'Finding 2'],
      recommendations: ['Recommendation 1'],
      generatedAt: new Date().toISOString(),
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export default router;
