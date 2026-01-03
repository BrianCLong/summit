// server/src/api/insightsRouter.ts
import express, { Router } from 'express';
import { InsightsController } from './insightsController';
import { InsightsService } from '../ai/InsightsService';
import { AnalyticsEngine } from '../ai/AnalyticsEngine';

export const createInsightsRouter = (
  insightsService: InsightsService,
  analyticsEngine: AnalyticsEngine
): Router => {
  const router = express.Router();
  const controller = new InsightsController(insightsService, analyticsEngine);

  // Generate insights for a specific metric
  router.post('/generate', controller.generateInsights.bind(controller));

  // Get recent insights
  router.get('/recent', controller.getRecentInsights.bind(controller));

  // Get insights summary
  router.get('/summary', controller.getInsightsSummary.bind(controller));

  // Register metric for scheduled insights
  router.post('/register-metric', controller.registerMetricForInsights.bind(controller));

  // Get predictive insights for a metric
  router.get('/predictions/:metric', controller.getPredictiveInsights.bind(controller));

  // Get trend analysis for a metric
  router.get('/trends/:metric', controller.getTrendAnalysis.bind(controller));

  // Get anomaly detection results
  router.get('/anomalies/:metric', controller.getAnomalyDetection.bind(controller));

  // Get metric correlations
  router.get('/correlations/:metric', controller.getMetricCorrelations.bind(controller));

  // Get seasonality analysis
  router.get('/seasonality/:metric', controller.getSeasonalityAnalysis.bind(controller));

  // Get forecasting
  router.get('/forecasting/:metric', controller.getForecasting.bind(controller));

  return router;
};