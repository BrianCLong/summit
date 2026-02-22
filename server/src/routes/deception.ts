// @ts-nocheck
import express, { Response, NextFunction } from 'express';
import { DeceptionService, HoneypotConfig, InteractionData } from '../services/DeceptionService.js';
import { z } from 'zod/v4';
import logger from '../utils/logger.js';
import { cfg } from '../config.js';
import type { AuthenticatedRequest } from './types.js';

const router = express.Router();
const deceptionService = new DeceptionService();

// Validation schemas
const deployHoneypotSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SSH', 'HTTP', 'DATABASE', 'FILE_SERVER']),
  vulnerabilities: z.array(z.string()),
  location: z.string()
});

const logInteractionSchema = z.object({
  honeypotId: z.string().uuid(),
  sourceIp: z.string().ip(),
  payload: z.string(),
  method: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Middleware to ensure tenantId
const ensureTenant = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Strictly require authenticated user for tenant context in production
  if (req.user?.tenantId) {
    (req as any).tenantId = req.user.tenantId;
    return next();
  }

  // Allow header override only in development
  if (cfg.NODE_ENV !== 'production' && req.headers['x-tenant-id']) {
    (req as any).tenantId = req.headers['x-tenant-id'];
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
};

router.use(ensureTenant);

// POST /api/deception/honeypots
router.post('/honeypots', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = deployHoneypotSchema.parse(req.body);
    const id = await deceptionService.deployHoneypot(validatedData, req.tenantId);
    res.status(201).json({ id, message: 'Honeypot deployed successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Error in POST /honeypots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deception/interactions
router.post('/interactions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = logInteractionSchema.parse(req.body);
    const { honeypotId, ...data } = validatedData;

    const interactionData: InteractionData = {
        sourceIp: data.sourceIp,
        payload: data.payload,
        method: data.method,
        timestamp: new Date(),
        metadata: data.metadata
    };

    try {
        const id = await deceptionService.logInteraction(honeypotId, interactionData, req.tenantId);
        res.status(201).json({ id, message: 'Interaction logged' });
    } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage === 'Honeypot not found') {
            return res.status(404).json({ error: 'Honeypot not found' });
        }
        throw err;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Error in POST /interactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deception/profiles
router.get('/profiles', async (req: AuthenticatedRequest, res: Response) => {
    const ip = (req.query.ip as any);
    if (!ip || typeof ip !== 'string' || !z.string().ip().safeParse(ip).success) {
        return res.status(400).json({ error: 'Valid IP address required' });
    }

    try {
        const profile = await deceptionService.profileAttacker(ip, req.tenantId);
        res.json(profile);
    } catch (error: any) {
        logger.error('Error in GET /profiles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/deception/threat-intel
router.get('/threat-intel', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const report = await deceptionService.generateThreatIntelligence(req.tenantId);
        res.json(report);
    } catch (error: any) {
        logger.error('Error in GET /threat-intel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const deceptionRouter = router;
