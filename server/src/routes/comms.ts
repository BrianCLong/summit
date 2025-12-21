import express from 'express';
import { InternalCommsService } from '../comms/InternalCommsService.js';
import { CommsAudience, CommsTier, CreateCommunicationDto, CreateTemplateDto } from '../comms/types.js';

const router = express.Router();
const commsService = InternalCommsService.getInstance();

// Middleware to get user id (assuming auth middleware is already applied)
// req.user should be populated.

// --- Communications ---

// GET /api/comms - List communications (feed)
router.get('/', (req, res) => {
  const { status, tier } = req.query;
  const comms = commsService.getCommunications({
    status: status as any,
    tier: tier as any
  });
  res.json(comms);
});

// POST /api/comms - Create Draft
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const dto: CreateCommunicationDto = {
      ...req.body,
      authorId: userId
    };
    const comm = await commsService.createDraft(dto);
    res.status(201).json(comm);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/comms/:id/submit - Submit for Approval
router.post('/:id/submit', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const comm = await commsService.submitForApproval(req.params.id, userId);
    res.json(comm);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/comms/:id/approve - Approve
router.post('/:id/approve', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const comm = await commsService.approve(req.params.id, userId);
    res.json(comm);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/comms/:id/publish - Publish
router.post('/:id/publish', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const comm = await commsService.publish(req.params.id, userId);
    res.json(comm);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Templates ---

// GET /api/comms/templates
router.get('/templates', async (req, res) => {
  const templates = await commsService.getTemplates();
  res.json(templates);
});

// POST /api/comms/templates
router.post('/templates', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const dto: CreateTemplateDto = req.body;
    const template = await commsService.createTemplate(dto);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
