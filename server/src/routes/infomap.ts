import express from 'express';
import { InfoMapService } from '../services/InfoMapService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(ensureAuthenticated);

/**
 * @route GET /api/infomap/nodes
 * @desc Get all information environment nodes
 * @access Private
 */
router.get('/nodes', asyncHandler(async (req, res) => {
  const service = InfoMapService.getInstance();
  const nodes = await service.getNodes();
  res.json({ success: true, count: nodes.length, data: nodes });
}));

/**
 * @route POST /api/infomap/ingest
 * @desc Ingest a new node
 * @access Private
 */
router.post('/ingest', asyncHandler(async (req, res) => {
  const service = InfoMapService.getInstance();
  const node = await service.ingestNode(req.body);
  res.status(201).json({ success: true, data: node });
}));

/**
 * @route POST /api/infomap/refresh
 * @desc Trigger a refresh cycle for node metadata
 * @access Private
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const service = InfoMapService.getInstance();
  const result = await service.triggerRefresh();
  res.json({ success: true, ...result });
}));

export default router;
