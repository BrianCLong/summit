/**
 * Report generation API routes
 */

import { Router } from 'express';
import { ReportGenerator } from '@summit/reporting';
import { AnalyticsTracker } from '@summit/reporting';
import { NarrativeGenerator } from '@summit/nlg';

const router = Router();

// Initialize services
const reportGenerator = new ReportGenerator({
  enableNLG: true,
  enableAutoSummary: true,
  enableChartGeneration: true,
  enableVisualization: true
});

const analyticsTracker = new AnalyticsTracker();
const narrativeGenerator = new NarrativeGenerator();

/**
 * POST /api/reports/generate
 * Generate a new report from template and data
 */
router.post('/generate', async (req, res) => {
  try {
    const request = req.body;

    const report = await reportGenerator.generateReport(request);

    // Initialize analytics
    analyticsTracker.initializeAnalytics(report.metadata.id);

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reports/:id/analytics
 * Get analytics for a report
 */
router.get('/:id/analytics', (req, res) => {
  try {
    const analytics = analyticsTracker.getAnalytics(req.params.id);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Analytics not found'
      });
    }

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reports/:id/view
 * Track a view event
 */
router.post('/:id/view', (req, res) => {
  try {
    const { userId, duration, sectionsViewed } = req.body;

    analyticsTracker.trackView({
      reportId: req.params.id,
      userId,
      timestamp: new Date(),
      duration,
      sectionsViewed
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reports/:id/download
 * Track a download event
 */
router.post('/:id/download', (req, res) => {
  try {
    const { userId, format } = req.body;

    analyticsTracker.trackDownload({
      reportId: req.params.id,
      userId,
      timestamp: new Date(),
      format
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reports/:id/feedback
 * Submit feedback for a report
 */
router.post('/:id/feedback', (req, res) => {
  try {
    const { userId, rating, comment } = req.body;

    analyticsTracker.trackFeedback({
      reportId: req.params.id,
      userId,
      rating,
      comment,
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reports/narrative
 * Generate narrative text from data
 */
router.post('/narrative', async (req, res) => {
  try {
    const narrative = await narrativeGenerator.generateNarrative(req.body);

    res.json({
      success: true,
      narrative
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reports/popular
 * Get popular reports
 */
router.get('/popular', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const popular = analyticsTracker.getPopularReports(limit);

    res.json({
      success: true,
      reports: popular
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as reportRoutes };
