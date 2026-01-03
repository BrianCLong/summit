// server/src/api/insightsController.ts
import { Request, Response } from 'express';
import { InsightsService } from '../ai/InsightsService';
import { logger } from '../utils/logger';

export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  /**
   * Generate insights for a specific metric
   */
  async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      const {
        metric,
        dimensions,
        timeRange = 'day',
        includePredictive = true,
        includeAnomalyDetection = true,
        includeTrendAnalysis = true
      } = req.body;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const insightParams = {
        metric,
        dimensions,
        timeRange,
        includePredictive,
        includeAnomalyDetection,
        includeTrendAnalysis
      };

      const result = await this.insightsService.generateInsights(insightParams);

      res.status(200).json(result);
    } catch (error) {
      logger.error(`Failed to generate insights`, error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  }

  /**
   * Get recent insights
   */
  async getRecentInsights(req: Request, res: Response): Promise<void> {
    try {
      const {
        limit = 50,
        category,
        severity
      } = req.query;

      const insights = await this.insightsService.getRecentInsights(
        parseInt(limit as string) || 50,
        category as any,
        severity as any
      );

      res.status(200).json(insights);
    } catch (error) {
      logger.error(`Failed to get recent insights`, error);
      res.status(500).json({ error: 'Failed to retrieve insights' });
    }
  }

  /**
   * Get insights summary
   */
  async getInsightsSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.insightsService.getInsightsSummary();
      res.status(200).json(summary);
    } catch (error) {
      logger.error(`Failed to get insights summary`, error);
      res.status(500).json({ error: 'Failed to retrieve insights summary' });
    }
  }

  /**
   * Register metric for scheduled insights
   */
  async registerMetricForInsights(req: Request, res: Response): Promise<void> {
    try {
      const {
        metric,
        schedule,
        config = {}
      } = req.body;

      if (!metric || !schedule) {
        res.status(400).json({ error: 'Metric and schedule are required' });
        return;
      }

      await this.insightsService.registerMetricForInsights(metric, schedule, config);
      res.status(200).json({ message: 'Metric registered for insights' });
    } catch (error) {
      logger.error(`Failed to register metric for insights`, error);
      res.status(500).json({ error: 'Failed to register metric for insights' });
    }
  }

  /**
   * Get predictive insights for a metric
   */
  async getPredictiveInsights(req: Request, res: Response): Promise<void> {
    try {
      const { metric, dimensions } = req.params;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const predictions = await this.analyticsEngine.generatePredictiveInsights(metric, dimensions);
      res.status(200).json(predictions);
    } catch (error) {
      logger.error(`Failed to get predictive insights for metric`, error);
      res.status(500).json({ error: 'Failed to retrieve predictive insights' });
    }
  }

  /**
   * Get trend analysis for a metric
   */
  async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { metric, dimensions } = req.params;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const trendAnalysis = await this.analyticsEngine.analyzeTrend(metric, dimensions);
      res.status(200).json(trendAnalysis);
    } catch (error) {
      logger.error(`Failed to get trend analysis for metric`, error);
      res.status(500).json({ error: 'Failed to retrieve trend analysis' });
    }
  }

  /**
   * Get anomaly detection results for a metric
   */
  async getAnomalyDetection(req: Request, res: Response): Promise<void> {
    try {
      const { metric, dimensions } = req.params;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const anomalyResults = await this.analyticsEngine.detectAnomalies(metric, dimensions);
      res.status(200).json(anomalyResults);
    } catch (error) {
      logger.error(`Failed to get anomaly detection for metric`, error);
      res.status(500).json({ error: 'Failed to retrieve anomaly detection results' });
    }
  }

  /**
   * Get metric correlations
   */
  async getMetricCorrelations(req: Request, res: Response): Promise<void> {
    try {
      const { metric } = req.params;
      const { timeRange = '1d', threshold = 0.7 } = req.query;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const correlations = await this.analyticsEngine.computeMetricCorrelations(
        metric,
        timeRange as string,
        parseFloat(threshold as string) || 0.7
      );
      res.status(200).json(correlations);
    } catch (error) {
      logger.error(`Failed to get metric correlations`, error);
      res.status(500).json({ error: 'Failed to retrieve metric correlations' });
    }
  }

  /**
   * Get seasonality analysis for a metric
   */
  async getSeasonalityAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { metric, dimensions } = req.params;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const seasonality = await this.analyticsEngine.analyzeSeasonality(metric, dimensions);
      res.status(200).json(seasonality);
    } catch (error) {
      logger.error(`Failed to get seasonality analysis for metric`, error);
      res.status(500).json({ error: 'Failed to retrieve seasonality analysis' });
    }
  }

  /**
   * Get forecasting for a metric
   */
  async getForecasting(req: Request, res: Response): Promise<void> {
    try {
      const { metric, dimensions } = req.params;
      const { horizon = '1d' } = req.query;

      if (!metric) {
        res.status(400).json({ error: 'Metric is required' });
        return;
      }

      const forecast = await this.analyticsEngine.generateForecast(metric, dimensions, horizon as string);
      res.status(200).json(forecast);
    } catch (error) {
      logger.error(`Failed to get forecast for metric`, error);
      res.status(500).json({ error: 'Failed to retrieve forecast' });
    }
  }
}