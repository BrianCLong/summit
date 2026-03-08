"use strict";
/**
 * Threat Assessment Service Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_js_1 = require("./service.js");
const app = (0, express_1.default)();
const port = process.env.PORT || 3021;
app.use(express_1.default.json());
const service = new service_js_1.ThreatAssessmentService();
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'threat-assessment' });
});
// Get attack probability
app.get('/api/attack-probability/:targetId', async (req, res) => {
    try {
        const probability = await service.calculateAttackProbability(req.params.targetId);
        res.json(probability);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to calculate probability' });
    }
});
// Get geographic threat map
app.get('/api/geographic-threats', async (req, res) => {
    try {
        const map = await service.generateGeographicThreatMap();
        res.json(map);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate threat map' });
    }
});
// Get sector threats
app.get('/api/sector-threats', async (req, res) => {
    try {
        const threats = await service.assessSectorThreats();
        res.json(threats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to assess sector threats' });
    }
});
// Get risk matrix
app.get('/api/risk-matrix', async (req, res) => {
    try {
        const matrix = await service.generateRiskMatrix();
        res.json(matrix);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate risk matrix' });
    }
});
// Get threat assessment
app.get('/api/assessment/:targetId', async (req, res) => {
    try {
        const assessment = await service.getAssessment(req.params.targetId);
        if (assessment) {
            res.json(assessment);
        }
        else {
            res.status(404).json({ error: 'Assessment not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get assessment' });
    }
});
app.listen(port, () => {
    console.log(`Threat assessment service listening on port ${port}`);
});
exports.default = app;
