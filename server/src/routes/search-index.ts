import express from 'express';
import { SearchIndexService } from '../search-index/SearchIndexService.js';
import { SearchQuery } from '../search-index/types.js';
import { logger } from '../config/logger.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/query', ensureAuthenticated, async (req, res) => {
  try {
    const input: SearchQuery = req.body;

    // Validate caseId
    if (!input.caseId) {
        return res.status(400).json({ error: 'caseId is required' });
    }

    const results = SearchIndexService.getInstance().search(input);
    res.json({ results });
  } catch (err: any) {
    logger.error('Search query failed', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/reindex', ensureAuthenticated, ensureRole(['admin']), async (req, res) => {
    // Admin/Dev only check would go here (middleware)
    try {
        const { caseId } = req.body;
        await SearchIndexService.getInstance().reindex(caseId);
        res.json({ status: 'Reindexing started' });
    } catch (err: any) {
        logger.error('Reindex failed', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
