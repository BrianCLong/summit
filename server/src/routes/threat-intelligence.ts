
import express from 'express';
import { ThreatIntelligenceFusionService } from '../services/ThreatIntelligenceFusionService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const fusionService = ThreatIntelligenceFusionService.getInstance();

/**
 * @route POST /api/threat-intel/ingest
 * @desc Ingest raw intelligence item
 * @access Protected
 */
router.post('/ingest', ensureAuthenticated, async (req, res) => {
  try {
    const { item, type } = req.body;
    const result = await fusionService.ingestItem(item, type);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/threat-intel/relationship
 * @desc Create a relationship between two entities
 * @access Protected
 */
router.post('/relationship', ensureAuthenticated, async (req, res) => {
  try {
    const { sourceId, targetId, type, props } = req.body;
    await fusionService.addRelationship(sourceId, targetId, type, props);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/threat-intel/dashboard
 * @desc Get aggregated dashboard data
 * @access Protected
 */
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const data = await fusionService.getDashboardData();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/threat-intel/briefing
 * @desc Generate and return daily briefing
 * @access Protected
 */
router.get('/briefing', ensureAuthenticated, async (req, res) => {
  try {
    const briefing = await fusionService.generateBriefing();
    res.json({ success: true, briefing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
