import express from 'express';
import { QueryReplayService } from '../services/query-replay/QueryReplayService';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureRole } from '../middleware/auth';

const router = express.Router();
const queryReplayService = QueryReplayService.getInstance();

// List slow queries
// Requires admin role as it exposes query content
router.get(
  '/logs',
  ensureAuthenticated,
  ensureRole(['admin', 'developer']),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const queries = await queryReplayService.getSlowQueries(limit, offset);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

// Replay a specific query
router.post(
  '/replay/:id',
  ensureAuthenticated,
  ensureRole(['admin', 'developer']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await queryReplayService.replayQuery(id);
      res.json(result);
    } catch (error) {
        if ((error as Error).message === 'Query not found') {
            res.status(404).json({ error: 'Query not found' });
        } else {
            res.status(500).json({ error: (error as Error).message });
        }
    }
  }
);

export default router;
