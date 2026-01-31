// @ts-nocheck
import express, { Response } from 'express';
import type { AuthenticatedRequest } from './types.js';
import { IngestionService } from '../aurelius/services/IngestionService.js';
import { InventionService } from '../aurelius/services/InventionService.js';
import { PriorArtService } from '../aurelius/services/PriorArtService.js';
import { CompetitiveIntelligenceService } from '../aurelius/services/CompetitiveIntelligenceService.js';
import { ForesightService } from '../aurelius/services/ForesightService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(tenantContext);

// --- IP Harvesting ---
router.post('/ingest/external', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { source, query } = req.body;
    const result = await IngestionService.getInstance().ingestExternal(
      source,
      query,
      req.user?.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// --- Prior Art ---
router.post('/prior-art/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query } = req.body;
    const result = await PriorArtService.getInstance().findSimilar(
      query,
      req.user?.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/prior-art/cluster', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await PriorArtService.getInstance().clusterPatents(req.user?.tenantId);
    res.json({ status: 'Clustering started' });
  } catch (err: any) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// --- Invention Engine ---
router.post('/invention/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { concepts, problem } = req.body;
    const result = await InventionService.getInstance().generateInvention(
      concepts,
      problem,
      req.user?.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// --- Competitive Intelligence ---
router.get('/competitors/market-map', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await CompetitiveIntelligenceService.getInstance().getMarketMap(
      req.user?.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// --- Foresight ---
router.post('/foresight/simulate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scenarioName, parameters } = req.body;
    const result = await ForesightService.getInstance().runSimulation(
      scenarioName,
      parameters,
      req.user?.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/foresight/opportunities', async (req: AuthenticatedRequest, res: Response) => {
    try {
        await ForesightService.getInstance().generateOpportunities(req.user?.tenantId);
        res.json({ status: 'Opportunity mapping started' });
    } catch (err: any) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

export default router;
