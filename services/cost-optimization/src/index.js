"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("./utils/logger");
const cost_analyzer_1 = require("./analyzers/cost-analyzer");
const rightsizing_1 = require("./services/rightsizing");
const tagging_1 = require("./services/tagging");
const budget_1 = require("./services/budget");
const recommendations_1 = require("./services/recommendations");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// Services
const costAnalyzer = new cost_analyzer_1.CostAnalyzer();
const rightsizing = new rightsizing_1.RightsizingService();
const tagging = new tagging_1.TaggingService();
const budget = new budget_1.BudgetService();
const recommendations = new recommendations_1.RecommendationService();
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'cost-optimization' });
});
// Cost analysis endpoints
app.get('/api/costs/current', async (req, res) => {
    try {
        const { provider, startDate, endDate } = req.query;
        const costs = await costAnalyzer.getCurrentCosts({
            provider: provider,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });
        res.json(costs);
    }
    catch (error) {
        logger_1.logger.error('Failed to get current costs:', error);
        res.status(500).json({ error: 'Failed to retrieve costs' });
    }
});
app.get('/api/costs/forecast', async (req, res) => {
    try {
        const { provider, days } = req.query;
        const forecast = await costAnalyzer.forecastCosts({
            provider: provider,
            days: days ? parseInt(days) : 30
        });
        res.json(forecast);
    }
    catch (error) {
        logger_1.logger.error('Failed to forecast costs:', error);
        res.status(500).json({ error: 'Failed to forecast costs' });
    }
});
app.get('/api/costs/breakdown', async (req, res) => {
    try {
        const { provider, groupBy } = req.query;
        const breakdown = await costAnalyzer.getCostBreakdown({
            provider: provider,
            groupBy: groupBy || 'service'
        });
        res.json(breakdown);
    }
    catch (error) {
        logger_1.logger.error('Failed to get cost breakdown:', error);
        res.status(500).json({ error: 'Failed to retrieve cost breakdown' });
    }
});
// Rightsizing endpoints
app.get('/api/rightsizing/recommendations', async (req, res) => {
    try {
        const { provider, resourceType } = req.query;
        const recommendations = await rightsizing.getRightsizingRecommendations({
            provider: provider,
            resourceType: resourceType
        });
        res.json(recommendations);
    }
    catch (error) {
        logger_1.logger.error('Failed to get rightsizing recommendations:', error);
        res.status(500).json({ error: 'Failed to retrieve recommendations' });
    }
});
app.post('/api/rightsizing/apply/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await rightsizing.applyRecommendation(id);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Failed to apply rightsizing recommendation:', error);
        res.status(500).json({ error: 'Failed to apply recommendation' });
    }
});
// Tagging endpoints
app.get('/api/tagging/untagged', async (req, res) => {
    try {
        const { provider } = req.query;
        const untagged = await tagging.getUntaggedResources({
            provider: provider
        });
        res.json(untagged);
    }
    catch (error) {
        logger_1.logger.error('Failed to get untagged resources:', error);
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
    }
    catch (error) {
        logger_1.logger.error('Failed to enforce tagging:', error);
        res.status(500).json({ error: 'Failed to enforce tagging' });
    }
});
// Budget endpoints
app.get('/api/budgets', async (req, res) => {
    try {
        const { provider } = req.query;
        const budgets = await budget.getBudgets({
            provider: provider
        });
        res.json(budgets);
    }
    catch (error) {
        logger_1.logger.error('Failed to get budgets:', error);
        res.status(500).json({ error: 'Failed to retrieve budgets' });
    }
});
app.post('/api/budgets', async (req, res) => {
    try {
        const budgetConfig = req.body;
        const result = await budget.createBudget(budgetConfig);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Failed to create budget:', error);
        res.status(500).json({ error: 'Failed to create budget' });
    }
});
app.get('/api/budgets/alerts', async (req, res) => {
    try {
        const { provider } = req.query;
        const alerts = await budget.getBudgetAlerts({
            provider: provider
        });
        res.json(alerts);
    }
    catch (error) {
        logger_1.logger.error('Failed to get budget alerts:', error);
        res.status(500).json({ error: 'Failed to retrieve budget alerts' });
    }
});
// Idle resources endpoints
app.get('/api/idle-resources', async (req, res) => {
    try {
        const { provider, resourceType } = req.query;
        const idle = await recommendations.getIdleResources({
            provider: provider,
            resourceType: resourceType
        });
        res.json(idle);
    }
    catch (error) {
        logger_1.logger.error('Failed to get idle resources:', error);
        res.status(500).json({ error: 'Failed to retrieve idle resources' });
    }
});
// Savings opportunities
app.get('/api/savings', async (req, res) => {
    try {
        const { provider } = req.query;
        const savings = await recommendations.getSavingsOpportunities({
            provider: provider
        });
        res.json(savings);
    }
    catch (error) {
        logger_1.logger.error('Failed to get savings opportunities:', error);
        res.status(500).json({ error: 'Failed to retrieve savings opportunities' });
    }
});
// Scheduled jobs
node_cron_1.default.schedule('0 */6 * * *', async () => {
    logger_1.logger.info('Running scheduled cost analysis...');
    try {
        await costAnalyzer.runAnalysis();
        await rightsizing.updateRecommendations();
        await tagging.scanForUntaggedResources();
        await budget.checkBudgets();
        logger_1.logger.info('Scheduled cost analysis completed');
    }
    catch (error) {
        logger_1.logger.error('Failed to run scheduled cost analysis:', error);
    }
});
// Daily reports
node_cron_1.default.schedule('0 8 * * *', async () => {
    logger_1.logger.info('Generating daily cost report...');
    try {
        await costAnalyzer.generateDailyReport();
        logger_1.logger.info('Daily cost report generated');
    }
    catch (error) {
        logger_1.logger.error('Failed to generate daily cost report:', error);
    }
});
// Start server
app.listen(PORT, () => {
    logger_1.logger.info(`Cost Optimization Service listening on port ${PORT}`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
exports.default = app;
