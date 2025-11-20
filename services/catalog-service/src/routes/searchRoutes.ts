/**
 * Search API Routes
 * Endpoints for semantic search and discovery
 */

import { Router } from 'express';
import { SearchController } from '../controllers/SearchController.js';

export const searchRouter = Router();
const controller = new SearchController();

/**
 * GET /api/v1/search
 * Search catalog assets
 */
searchRouter.get('/', async (req, res, next) => {
  try {
    await controller.search(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/search
 * Advanced search with filters
 */
searchRouter.post('/', async (req, res, next) => {
  try {
    await controller.advancedSearch(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/search/suggestions
 * Get search suggestions
 */
searchRouter.get('/suggestions', async (req, res, next) => {
  try {
    await controller.getSuggestions(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/search/click
 * Record search result click
 */
searchRouter.post('/click', async (req, res, next) => {
  try {
    await controller.recordClick(req, res);
  } catch (error) {
    next(error);
  }
});
