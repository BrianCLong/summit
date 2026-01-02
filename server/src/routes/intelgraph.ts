// @ts-nocheck
import express, { Response, NextFunction } from 'express';
import { intelGraphService } from '../services/IntelGraphService.js';
import { ensurePolicy } from '../middleware/abac.js';
import { requireStepUp } from '../auth/webauthn/middleware.js';
import { z } from 'zod';
import type { AuthenticatedRequest } from './types.js';

const router = express.Router();

const decisionSchema = z.object({
  tenantId: z.string(),
  outcome: z.string(),
  rationale: z.string(),
  confidenceScore: z.number().min(0).max(1),
  actorId: z.string(),
  classification: z.string().optional(),
  claimIds: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([])
});

const claimSchema = z.object({
  tenantId: z.string(),
  text: z.string(),
  type: z.string(),
  source: z.string().optional(),
  classification: z.string().optional()
});

router.post('/decisions', ensurePolicy('create', 'decision'), requireStepUp, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = decisionSchema.parse(req.body);
    const { claimIds, evidenceIds, ...decisionData } = body;

    const receipt = await intelGraphService.createDecision(
      decisionData,
      claimIds,
      evidenceIds
    );

    res.status(201).json({ receipt });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating decision:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/claims', ensurePolicy('create', 'claim'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = claimSchema.parse(req.body);
    const claimId = await intelGraphService.createClaim(body);
    res.status(201).json({ claimId });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating claim:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/decisions/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await intelGraphService.getDecisionWithReceipt(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Decision not found' });
        }
        res.json(result);
    } catch (error: any) {
        console.error('Error getting decision:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const intelGraphRouter = router;
