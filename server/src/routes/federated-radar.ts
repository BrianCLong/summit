import express from 'express';
import { FederatedCampaignRadarService } from '../services/FederatedCampaignRadarService.js';
import { z } from 'zod';

const router = express.Router();
const service = FederatedCampaignRadarService.getInstance();

const signalSchema = z.object({
  type: z.enum(['CLAIM', 'NARRATIVE', 'MEDIA', 'URL']),
  value: z.string(),
  metadata: z.object({
    source_platform: z.string().optional(),
    coordination_score: z.number().optional(),
    account_age_days: z.number().optional(),
    c2pa_provenance: z.any().optional()
  }).passthrough()
});

// GET /api/federated-radar/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await service.getGlobalCampaigns();
    res.json({
        data: campaigns
    });
  } catch (error) {
    console.error('Error fetching campaigns', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/federated-radar/signals
router.post('/signals', async (req, res) => {
  try {
    // Validate input
    const parseResult = signalSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error });
      return;
    }

    // In a real scenario, this would come from the auth middleware
    const tenantId = (req as any).user?.tenant_id || (req as any).user?.tenantId || 'default-tenant';

    const signal = parseResult.data;
    const result = await service.submitSignal(tenantId, signal as any);

    res.status(201).json({
        message: 'Signal submitted successfully',
        data: result
    });
  } catch (error) {
    console.error('Error submitting signal', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
