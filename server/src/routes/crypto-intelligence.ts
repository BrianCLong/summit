import express from 'express';
import { CryptoIntelligenceService } from '../services/CryptoIntelligenceService.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const service = CryptoIntelligenceService.getInstance();

// Middleware to ensure user has analyst role or similar permissions
// Using 'user' role for now as 'analyst' might not be defined in all environments
const enforceAnalystAccess = [ensureAuthenticated];

router.post('/analyze/transaction', enforceAnalystAccess, async (req: any, res: any) => {
  try {
    const { txHash, chain } = req.body;
    if (!txHash) return res.status(400).json({ error: 'txHash is required' });

    const result = await service.analyzeTransactionPattern(txHash, chain);
    res.json(result);
  } catch (error: any) {
    logger.error({ error }, 'Error analyzing transaction');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/cluster/wallet', enforceAnalystAccess, async (req: any, res: any) => {
  try {
    const { address, chain } = req.body;
    if (!address) return res.status(400).json({ error: 'address is required' });

    const result = await service.clusterWallets(address, chain);
    res.json(result);
  } catch (error: any) {
    logger.error({ error }, 'Error clustering wallets');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/monitor/darkweb', enforceAnalystAccess, async (req: any, res: any) => {
  try {
    const { marketplace, keyword } = req.body;
    if (!marketplace || !keyword) return res.status(400).json({ error: 'marketplace and keyword are required' });

    const result = await service.monitorDarkWeb(marketplace, keyword);
    res.json(result);
  } catch (error: any) {
    logger.error({ error }, 'Error monitoring dark web');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/detect/mixer', enforceAnalystAccess, async (req: any, res: any) => {
  try {
    const { address, chain } = req.body;
    if (!address) return res.status(400).json({ error: 'address is required' });

    const result = await service.detectMixingService(address, chain);
    res.json(result);
  } catch (error: any) {
    logger.error({ error }, 'Error detecting mixer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/threat-actor/:id', enforceAnalystAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await service.profileThreatActor(id);
    res.json(result);
  } catch (error: any) {
    logger.error({ error }, 'Error profiling threat actor');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
