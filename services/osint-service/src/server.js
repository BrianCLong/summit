"use strict";
/**
 * OSINT Service - REST API for OSINT operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const osint_collector_1 = require("@intelgraph/osint-collector");
const web_scraper_1 = require("@intelgraph/web-scraper");
const attribution_engine_1 = require("@intelgraph/attribution-engine");
const app = (0, express_1.default)();
const PORT = process.env.OSINT_SERVICE_PORT || 3010;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize services
const scheduler = new osint_collector_1.CollectionScheduler();
const scraperEngine = new web_scraper_1.ScraperEngine();
const attributionEngine = new attribution_engine_1.AttributionEngine();
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'osint-service' });
});
// Collection endpoints
app.post('/api/collect', async (req, res) => {
    try {
        const { type, source, target } = req.body;
        res.json({ message: 'Collection started', taskId: `task-${Date.now()}` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Scraping endpoints
app.post('/api/scrape', async (req, res) => {
    try {
        const { url, method } = req.body;
        const result = await scraperEngine.scrape({
            id: `scrape-${Date.now()}`,
            url,
            method: method || 'static'
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Attribution endpoints
app.post('/api/attribute', async (req, res) => {
    try {
        const { identifier } = req.body;
        const result = await attributionEngine.attributeIdentity(identifier);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Start server
async function start() {
    await scraperEngine.initialize();
    app.listen(PORT, () => {
        console.log(`OSINT Service running on port ${PORT}`);
    });
}
start().catch(console.error);
exports.default = app;
