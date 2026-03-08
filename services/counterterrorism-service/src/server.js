"use strict";
/**
 * Counterterrorism Service Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_js_1 = require("./service.js");
const app = (0, express_1.default)();
const port = process.env.PORT || 3020;
app.use(express_1.default.json());
const service = new service_js_1.CounterterrorismService();
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'counterterrorism' });
});
// Get threat picture
app.get('/api/threat-picture', async (req, res) => {
    try {
        const picture = await service.getThreatPicture();
        res.json(picture);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get threat picture' });
    }
});
// Get interdiction opportunities
app.get('/api/interdiction-opportunities', async (req, res) => {
    try {
        const opportunities = await service.identifyInterdictionOpportunities();
        res.json(opportunities);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to identify opportunities' });
    }
});
// Get disruption targets
app.get('/api/disruption-targets', async (req, res) => {
    try {
        const targets = await service.identifyDisruptionTargets();
        res.json(targets);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to identify targets' });
    }
});
// Access component services
app.get('/api/services/:service', (req, res) => {
    const services = service.getServices();
    const requestedService = req.params.service;
    if (requestedService in services) {
        res.json({ available: true, service: requestedService });
    }
    else {
        res.status(404).json({ error: 'Service not found' });
    }
});
app.listen(port, () => {
    console.log(`Counterterrorism service listening on port ${port}`);
});
exports.default = app;
