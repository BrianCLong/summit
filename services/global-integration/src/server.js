"use strict";
/**
 * Global Integration Service Server
 *
 * HTTP API for the Zero-Click Multi-Language Global Integration system.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const GlobalIntegrationOrchestrator_1 = require("./GlobalIntegrationOrchestrator");
const PartnerDiscovery_1 = require("./PartnerDiscovery");
const APIGenerator_1 = require("./APIGenerator");
const ComplianceEngine_1 = require("./ComplianceEngine");
const MarketExpansion_1 = require("./MarketExpansion");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// Initialize services
const orchestrator = new GlobalIntegrationOrchestrator_1.GlobalIntegrationOrchestrator({
    autoDiscovery: process.env.AUTO_DISCOVERY === 'true',
    autoGenerate: true,
    autoActivate: false,
    requireApproval: true,
    xRoadEnabled: process.env.XROAD_ENABLED === 'true',
});
const discoveryService = new PartnerDiscovery_1.PartnerDiscoveryService();
const apiGenerator = new APIGenerator_1.APIGeneratorService();
const complianceEngine = new ComplianceEngine_1.ComplianceEngine();
const marketExpansion = new MarketExpansion_1.MarketExpansionService();
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'global-integration' });
});
// Metrics endpoint
app.get('/api/v1/metrics', async (_req, res) => {
    try {
        const metrics = await orchestrator.getMetrics();
        res.json(metrics);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});
// Discovery endpoints
app.post('/api/v1/discover', async (req, res) => {
    try {
        const { regions, partnerTypes, complianceFrameworks } = req.body;
        const results = await discoveryService.discoverAll({
            regions,
            partnerTypes,
            complianceFrameworks,
        });
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: 'Discovery failed' });
    }
});
app.get('/api/v1/discover/:region', async (req, res) => {
    try {
        const region = req.params.region;
        const results = await orchestrator.discoverPartnersInRegion(region);
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: 'Discovery failed' });
    }
});
app.get('/api/v1/discovery/stats', (_req, res) => {
    const stats = discoveryService.getStatistics();
    res.json(stats);
});
// Integration endpoints
app.post('/api/v1/integrations/generate', async (req, res) => {
    try {
        const { partner } = req.body;
        const integration = await orchestrator.generateIntegration(partner);
        res.status(201).json(integration);
    }
    catch (error) {
        res.status(500).json({ error: 'Integration generation failed' });
    }
});
app.post('/api/v1/integrations/:partnerId/activate', async (req, res) => {
    try {
        await orchestrator.activateIntegration(req.params.partnerId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Activation failed' });
    }
});
app.post('/api/v1/integrations/:partnerId/suspend', async (req, res) => {
    try {
        const { reason } = req.body;
        await orchestrator.suspendIntegration(req.params.partnerId, reason);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Suspension failed' });
    }
});
// API Generation endpoints
app.post('/api/v1/generate/api', async (req, res) => {
    try {
        const { partner, apiSpec } = req.body;
        const generatedAPI = await apiGenerator.generateAPI(partner, apiSpec);
        res.status(201).json(generatedAPI);
    }
    catch (error) {
        res.status(500).json({ error: 'API generation failed' });
    }
});
// Compliance endpoints
app.post('/api/v1/compliance/validate', async (req, res) => {
    try {
        const { partner, context } = req.body;
        const report = await complianceEngine.validateCompliance(partner, context);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: 'Compliance validation failed' });
    }
});
app.post('/api/v1/compliance/transfer-assessment', async (req, res) => {
    try {
        const { sourceRegion, targetRegion } = req.body;
        const assessment = await complianceEngine.assessDataTransfer(sourceRegion, targetRegion);
        res.json(assessment);
    }
    catch (error) {
        res.status(500).json({ error: 'Transfer assessment failed' });
    }
});
app.get('/api/v1/compliance/status', (_req, res) => {
    const status = complianceEngine.getComplianceStatus();
    res.json(status);
});
app.post('/api/v1/compliance/auto-remediate', async (req, res) => {
    try {
        const { gaps } = req.body;
        const result = await complianceEngine.autoRemediate(gaps);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Auto-remediation failed' });
    }
});
// Market Expansion endpoints
app.get('/api/v1/markets', (_req, res) => {
    const regions = marketExpansion.getSupportedRegions();
    res.json({ regions });
});
app.get('/api/v1/markets/:region', (req, res) => {
    const region = req.params.region;
    const profile = marketExpansion.getMarketProfile(region);
    if (!profile) {
        res.status(404).json({ error: 'Market not found' });
        return;
    }
    res.json(profile);
});
app.get('/api/v1/markets/:region/analyze', (req, res) => {
    const region = req.params.region;
    const analysis = marketExpansion.analyzeOpportunity(region);
    res.json(analysis);
});
app.get('/api/v1/markets/:region/strategy', (req, res) => {
    const region = req.params.region;
    const strategy = marketExpansion.getExpansionStrategy(region);
    res.json(strategy);
});
app.post('/api/v1/expansion/plans', async (req, res) => {
    try {
        const { targetRegion, options } = req.body;
        const plan = await marketExpansion.createExpansionPlan(targetRegion, options);
        res.status(201).json(plan);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create expansion plan' });
    }
});
app.get('/api/v1/expansion/plans', (_req, res) => {
    const plans = marketExpansion.listExpansionPlans();
    res.json({ plans });
});
app.get('/api/v1/expansion/plans/:planId', (req, res) => {
    const plan = marketExpansion.getExpansionPlanStatus(req.params.planId);
    if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
    }
    res.json(plan);
});
app.post('/api/v1/expansion/plans/:planId/execute', async (req, res) => {
    try {
        const result = await marketExpansion.executeExpansionPlan(req.params.planId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Execution failed' });
    }
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[GlobalIntegration] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
const PORT = process.env.PORT || 4050;
async function start() {
    await orchestrator.start();
    app.listen(PORT, () => {
        console.log(`[GlobalIntegration] Server running on port ${PORT}`);
        console.log(`[GlobalIntegration] Health: http://localhost:${PORT}/health`);
        console.log(`[GlobalIntegration] API: http://localhost:${PORT}/api/v1`);
    });
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[GlobalIntegration] Shutting down...');
    await orchestrator.stop();
    process.exit(0);
});
start().catch(console.error);
