"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const InfluenceOperationsService_js_1 = require("../services/InfluenceOperationsService.js");
const NarrativeAnalysisService_js_1 = require("../services/NarrativeAnalysisService.js");
const CIBDetectionService_js_1 = require("../services/CIBDetectionService.js");
const SentimentAnalysisService_js_1 = require("../services/SentimentAnalysisService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
const influenceService = InfluenceOperationsService_js_1.InfluenceOperationsService.getInstance();
const narrativeService = new NarrativeAnalysisService_js_1.NarrativeAnalysisService();
const cibService = new CIBDetectionService_js_1.CIBDetectionService();
const sentimentService = new SentimentAnalysisService_js_1.SentimentAnalysisService();
// Trigger narrative detection/snapshot
router.post('/narrative/:id/detect', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const narrativeId = req.params.id;
        const snapshot = await narrativeService.takeSnapshot(narrativeId);
        res.json(snapshot);
    }
    catch (error) {
        logger_js_1.default.error('Error in narrative detection', error);
        res.status(500).json({ error: 'Detection failed' });
    }
});
// Get narrative evolution
router.get('/narrative/:id/evolution', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const history = await narrativeService.getNarrativeEvolution(req.params.id);
        const trends = await narrativeService.detectTrends(req.params.id);
        res.json({ history, trends });
    }
    catch (error) {
        logger_js_1.default.error('Error fetching narrative evolution', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
// Get graph stats/metrics
router.get('/narrative/:id/graph', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        // Expose graph centrality and communities
        const network = await influenceService.getInfluenceNetwork(req.params.id);
        res.json(network);
    }
    catch (error) {
        logger_js_1.default.error('Error fetching graph network', error);
        res.status(500).json({ error: 'Failed to fetch network' });
    }
});
// Analyze sentiment (ad-hoc)
router.post('/analyze/sentiment', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { text, topic } = req.body;
        if (!text)
            return res.status(400).json({ error: 'Text required' });
        const sentiment = sentimentService.analyzeSentiment(text);
        const emotion = sentimentService.analyzeEmotion(text);
        const toxicity = sentimentService.analyzeToxicity(text);
        const stance = topic ? sentimentService.analyzeStance(text, topic) : null;
        res.json({ sentiment, emotion, toxicity, stance });
    }
    catch (error) {
        logger_js_1.default.error('Error analyzing sentiment', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});
// CIB Detection Trigger
router.post('/cib/detect', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { entityIds, telemetry, texts } = req.body;
        // Transform JSON body to Maps
        const telemetryMap = new Map(Object.entries(telemetry || {}));
        const textsMap = new Map(Object.entries(texts || {}));
        const result = await cibService.detectCIB(entityIds || [], telemetryMap, textsMap);
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Error detecting CIB', error);
        res.status(500).json({ error: 'CIB detection failed' });
    }
});
exports.default = router;
