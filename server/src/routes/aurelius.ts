
import express from 'express';
import { IngestionService } from '../aurelius/services/IngestionService';
import { InventionService } from '../aurelius/services/InventionService';
import { PriorArtService } from '../aurelius/services/PriorArtService';
import { CompetitiveIntelligenceService } from '../aurelius/services/CompetitiveIntelligenceService';
import { ForesightService } from '../aurelius/services/ForesightService';
import { ensureAuthenticated } from '../middleware/auth';
import { tenantContext } from '../middleware/tenantContext';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(tenantContext);

// --- IP Harvesting ---
router.post('/ingest/external', async (req, res) => {
  try {
    const { source, query } = req.body;
    const result = await IngestionService.getInstance().ingestExternal(
      source,
      query,
      (req as any).user.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Prior Art ---
router.post('/prior-art/search', async (req, res) => {
  try {
    const { query } = req.body;
    const result = await PriorArtService.getInstance().findSimilar(
      query,
      (req as any).user.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prior-art/cluster', async (req, res) => {
  try {
    await PriorArtService.getInstance().clusterPatents((req as any).user.tenantId);
    res.json({ status: 'Clustering started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Invention Engine ---
router.post('/invention/generate', async (req, res) => {
  try {
    const { concepts, problem } = req.body;
    const result = await InventionService.getInstance().generateInvention(
      concepts,
      problem,
      (req as any).user.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Competitive Intelligence ---
router.get('/competitors/market-map', async (req, res) => {
  try {
    const result = await CompetitiveIntelligenceService.getInstance().getMarketMap(
      (req as any).user.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Foresight ---
router.post('/foresight/simulate', async (req, res) => {
  try {
    const { scenarioName, parameters } = req.body;
    const result = await ForesightService.getInstance().runSimulation(
      scenarioName,
      parameters,
      (req as any).user.tenantId
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/foresight/opportunities', async (req, res) => {
    try {
        await ForesightService.getInstance().generateOpportunities((req as any).user.tenantId);
        res.json({ status: 'Opportunity mapping started' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
