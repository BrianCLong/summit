/**
 * Dissemination and distribution API routes
 */

import { Router } from 'express';
import { DistributionManager } from '@summit/dissemination';

const router = Router();

// Initialize distribution manager
const distributionManager = new DistributionManager();

/**
 * POST /api/dissemination/distribute
 * Distribute report to recipient
 */
router.post('/distribute', (req, res) => {
  try {
    const { reportId, recipient, method, options } = req.body;
    const record = distributionManager.distribute(reportId, recipient, method, options);

    res.json({
      success: true,
      record
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dissemination/track-access
 * Track access to distributed report
 */
router.post('/track-access', (req, res) => {
  try {
    const { trackingId, ipAddress, userAgent } = req.body;
    distributionManager.trackAccess(trackingId, ipAddress, userAgent);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dissemination/track-download
 * Track download of distributed report
 */
router.post('/track-download', (req, res) => {
  try {
    const { trackingId } = req.body;
    distributionManager.trackDownload(trackingId);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dissemination/:reportId/records
 * Get distribution records for report
 */
router.get('/:reportId/records', (req, res) => {
  try {
    const records = distributionManager.getDistributionRecords(req.params.reportId);

    res.json({
      success: true,
      records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dissemination/:reportId/stats
 * Get distribution statistics
 */
router.get('/:reportId/stats', (req, res) => {
  try {
    const stats = distributionManager.getDistributionStats(req.params.reportId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dissemination/lists
 * Create distribution list
 */
router.post('/lists', (req, res) => {
  try {
    const list = distributionManager.createDistributionList(req.body);

    res.json({
      success: true,
      list
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as disseminationRoutes };
