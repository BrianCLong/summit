import express from 'express';
import { growthPlaybookService, CompanyProfile } from '../services/GrowthPlaybookService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/growth/playbook
 * Generate a personalized growth playbook
 */
router.post('/playbook', async (req, res) => {
  try {
    const profile: CompanyProfile = req.body;

    if (!profile.name || !profile.industry || !profile.challenges) {
      return res.status(400).json({ error: 'Missing required company profile fields' });
    }

    logger.info(`Generating growth playbook for ${profile.name}`);
    const playbook = await growthPlaybookService.generatePlaybook(profile);

    res.json({ data: playbook });
  } catch (error) {
    logger.error('Failed to generate playbook', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
