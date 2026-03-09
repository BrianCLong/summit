// @ts-nocheck
import { Router, type Request, type Response } from 'express';
import {
  calculateDegreeCentrality,
  calculateBetweenness,
  detectCommunities,
  findShortestPath
} from '../graph/algorithms.js';
import { InfluenceDetectionService } from '../services/InfluenceDetectionService.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod/v4';

const router = Router();

// Define Zod schemas for validation
const ShortestPathSchema = z.object({
  startNodeId: z.string(),
  endNodeId: z.string()
});

const TimeWindowSchema = z.object({
  minutes: z.coerce.number().default(60)
});

// Extend Express Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    tenantId?: string;
    id?: string;
  };
}

router.use(authenticate);

/**
 * @route GET /api/graph/centrality
 * @desc Calculate Degree Centrality (Influence)
 */
router.get('/centrality', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const results = await calculateDegreeCentrality(tenantId);
    res.json(results);
  } catch (error: any) {
    console.error('Graph Algorithm Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route GET /api/graph/betweenness
 * @desc Calculate Betweenness Centrality (Bridges)
 */
router.get('/betweenness', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const results = await calculateBetweenness(tenantId);
    res.json(results);
  } catch (error: any) {
    console.error('Graph Algorithm Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route GET /api/graph/communities
 * @desc Detect Communities (Clusters)
 */
router.get('/communities', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const results = await detectCommunities(tenantId);
    res.json(results);
  } catch (error: any) {
    console.error('Graph Algorithm Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route POST /api/graph/path
 * @desc Find shortest path
 */
router.post('/path', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const { startNodeId, endNodeId } = ShortestPathSchema.parse(req.body);
    const result = await findShortestPath(tenantId, startNodeId, endNodeId);
    res.json(result);
  } catch (error: any) {
    console.error('Graph Algorithm Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route GET /api/graph/influence/bots
 * @desc Detect potential bots
 */
router.get('/influence/bots', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const results = await InfluenceDetectionService.detectBots(tenantId);
    res.json(results);
  } catch (error: any) {
    console.error('Influence Detection Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route GET /api/graph/influence/coordinated
 * @desc Detect coordinated behavior
 */
router.get('/influence/coordinated', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const { minutes } = TimeWindowSchema.parse(req.query);
    const results = await InfluenceDetectionService.detectCoordinatedBehavior(tenantId, minutes);
    res.json(results);
  } catch (error: any) {
    console.error('Influence Detection Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route GET /api/graph/influence/amplification
 * @desc Identify amplification networks
 */
router.get('/influence/amplification', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const results = await InfluenceDetectionService.identifyAmplificationNetworks(tenantId);
    res.json(results);
  } catch (error: any) {
    console.error('Influence Detection Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
