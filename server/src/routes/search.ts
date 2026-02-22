// @ts-nocheck
import express, { type Request, type Response } from 'express';
import SemanticSearchService from '../services/SemanticSearchService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Initialize the service
// In a real app, this should be a singleton or injected
const searchService = new SemanticSearchService();

/**
 * POST /api/search
 * Advanced hybrid search endpoint
 */
router.post('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      q,
      filters, // { status: [], dateFrom, dateTo, entityType, evidenceCategory }
      limit = 20
    } = req.body;

    if (!q) {
      return res.status(400).json({ error: 'Query string is required' });
    }

    const results = await searchService.searchCases(q, filters, limit);
    res.json(results);
  } catch (error: any) {
    logger.error({ error }, 'Advanced search failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/search/autocomplete
 * Search suggestions
 */
router.get('/autocomplete', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { q, limit = 5 } = req.query as any;

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const suggestions = await searchService.getAutocomplete(q, Number(limit));
    res.json(suggestions);
  } catch (error: any) {
    logger.error({ error }, 'Autocomplete failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
