/**
 * Cost Optimization Service
 *
 * Provides multi-cloud cost optimization with:
 * - Resource tagging enforcement
 * - Cost allocation and chargeback
 * - Rightsizing recommendations
 * - Idle resource detection
 * - Budget alerts
 * - FinOps automation
 */

import express from 'express';
import cron from 'node-cron';
import { logger } from './utils/logger';
import { CostAnalyzer } from './analyzers/cost-analyzer';
import { RightsizingService } from './services/rightsizing';
import { TaggingService } from './services/tagging';
import { BudgetService } from './services/budget';
import { RecommendationService } from './services/recommendations';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Services
const costAnalyzer = new CostAnalyzer();
const rightsizing = new RightsizingService();
const tagging = new TaggingService();
const budget = new BudgetService();
const recommendations = new RecommendationService();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'cost-optimization' });
});

// Cost analysis endpoints
app.get('/api/costs/current', async (req, res) => {
  try {
    const { provider, startDate, endDate } = req.query;

    const costs = await costAnalyzer.getCurrentCosts({
      provider: provider as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(costs);
  } catch (error) {
    logger.error('Failed to get current costs:', error);
    res.status(500).json({ error: 'Failed to retrieve costs' });
  }
});

app.get('/api/costs/forecast', async (req, res) => {
  try {
    const { provider, days } = req.query;

    const forecast = await costAnalyzer.forecastCosts({
      provider: provider as string,
      days: days ? parseInt(days as string) : 30
    });

    res.json(forecast);
  } catch (error) {
    logger.error('Failed to forecast costs:', error);
    res.status(500).json({ error: 'Failed to forecast costs' });
  }
});

app.get('/api/costs/breakdown', async (req, res) => {
  try {
    const { provider, groupBy } = req.query;

    const breakdown = await costAnalyzer.getCostBreakdown({
      provider: provider as string,
      groupBy: groupBy as string || 'service'
    });

    res.json(breakdown);
  } catch (error) {
    logger.error('Failed to get cost breakdown:', error);
    res.status(500).json({ error: 'Failed to retrieve cost breakdown' });
  }
});

// Rightsizing endpoints
app.get('/api/rightsizing/recommendations', async (req, res) => {
  try {
    const { provider, resourceType } = req.query;

    const recommendations = await rightsizing.getRightsizingRecommendations({
      provider: provider as string,
      resourceType: resourceType as string
    });

    res.json(recommendations);
  } catch (error) {
    logger.error('Failed to get rightsizing recommendations:', error);
    res.status(500).json({ error: 'Failed to retrieve recommendations' });
  }
});

app.post('/api/rightsizing/apply/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await rightsizing.applyRecommendation(id);

    res.json(result);
  } catch (error) {
    logger.error('Failed to apply rightsizing recommendation:', error);
    res.status(500).json({ error: 'Failed to apply recommendation' });
  }
});

// Tagging endpoints
app.get('/api/tagging/untagged', async (req, res) => {
  try {
    const { provider } = req.query;

    const untagged = await tagging.getUntaggedResources({
      provider: provider as string
    });

    res.json(untagged);
  } catch (error) {
    logger.error('Failed to get untagged resources:', error);
    res.status(500).json({ error: 'Failed to retrieve untagged resources' });
  }
});

app.post('/api/tagging/enforce', async (req, res) => {
  try {
    const { provider, dryRun } = req.body;

    const result = await tagging.enforceTagging({
      provider,
      dryRun: dryRun ?? true
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to enforce tagging:', error);
    res.status(500).json({ error: 'Failed to enforce tagging' });
  }
});

// Budget endpoints
app.get('/api/budgets', async (req, res) => {
  try {
    const { provider } = req.query;

    const budgets = await budget.getBudgets({
      provider: provider as string
    });

    res.json(budgets);
  } catch (error) {
    logger.error('Failed to get budgets:', error);
    res.status(500).json({ error: 'Failed to retrieve budgets' });
  }
});

app.post('/api/budgets', async (req, res) => {
  try {
    const budgetConfig = req.body;

    const result = await budget.createBudget(budgetConfig);

    res.json(result);
  } catch (error) {
    logger.error('Failed to create budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

app.get('/api/budgets/alerts', async (req, res) => {
  try {
    const { provider } = req.query;

    const alerts = await budget.getBudgetAlerts({
      provider: provider as string
    });

    res.json(alerts);
  } catch (error) {
    logger.error('Failed to get budget alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve budget alerts' });
  }
});

// Idle resources endpoints
app.get('/api/idle-resources', async (req, res) => {
  try {
    const { provider, resourceType } = req.query;

    const idle = await recommendations.getIdleResources({
      provider: provider as string,
      resourceType: resourceType as string
    });

    res.json(idle);
  } catch (error) {
    logger.error('Failed to get idle resources:', error);
    res.status(500).json({ error: 'Failed to retrieve idle resources' });
  }
});

// Savings opportunities
app.get('/api/savings', async (req, res) => {
  try {
    const { provider } = req.query;

    const savings = await recommendations.getSavingsOpportunities({
      provider: provider as string
    });

    res.json(savings);
  } catch (error) {
    logger.error('Failed to get savings opportunities:', error);
    res.status(500).json({ error: 'Failed to retrieve savings opportunities' });
  }
});

// Scheduled jobs
cron.schedule('0 */6 * * *', async () => {
  logger.info('Running scheduled cost analysis...');
  try {
    await costAnalyzer.runAnalysis();
    await rightsizing.updateRecommendations();
    await tagging.scanForUntaggedResources();
    await budget.checkBudgets();
    logger.info('Scheduled cost analysis completed');
  } catch (error) {
    logger.error('Failed to run scheduled cost analysis:', error);
  }
});

// Daily reports
cron.schedule('0 8 * * *', async () => {
  logger.info('Generating daily cost report...');
  try {
    await costAnalyzer.generateDailyReport();
    logger.info('Daily cost report generated');
  } catch (error) {
    logger.error('Failed to generate daily cost report:', error);
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Cost Optimization Service listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

export default app;
