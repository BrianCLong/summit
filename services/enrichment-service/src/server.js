"use strict";
/**
 * Enrichment Service - Data enrichment and analysis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const social_media_intel_1 = require("@intelgraph/social-media-intel");
const listTransforms_js_1 = require("./api/listTransforms.js");
const app = (0, express_1.default)();
const PORT = process.env.ENRICHMENT_SERVICE_PORT || 3011;
app.use(express_1.default.json());
const sentimentAnalyzer = new social_media_intel_1.SentimentAnalyzer();
const profileAnalyzer = new social_media_intel_1.ProfileAnalyzer();
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'enrichment-service' });
});
app.get('/api/transforms', listTransforms_js_1.listTransforms);
app.post('/api/enrich/sentiment', (req, res) => {
    const { text } = req.body;
    const result = sentimentAnalyzer.analyze(text);
    res.json(result);
});
app.post('/api/enrich/profile', (req, res) => {
    const { profile } = req.body;
    const result = profileAnalyzer.analyzeProfile(profile);
    res.json(result);
});
app.listen(PORT, () => {
    console.log(`Enrichment Service running on port ${PORT}`);
});
exports.default = app;
