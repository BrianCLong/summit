"use strict";
/**
 * Sentiment analysis routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSentimentRouter = createSentimentRouter;
const express_1 = require("express");
const text_analytics_1 = require("@intelgraph/text-analytics");
function createSentimentRouter() {
    const router = (0, express_1.Router)();
    const sentimentAnalyzer = new text_analytics_1.SentimentAnalyzer();
    /**
     * POST /api/sentiment/analyze
     * Analyze sentiment
     */
    router.post('/analyze', async (req, res, next) => {
        try {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            const result = sentimentAnalyzer.analyze(text);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /api/sentiment/aspects
     * Aspect-based sentiment analysis
     */
    router.post('/aspects', async (req, res, next) => {
        try {
            const { text, aspects } = req.body;
            if (!text || !aspects) {
                return res.status(400).json({ error: 'Text and aspects are required' });
            }
            const result = sentimentAnalyzer.analyzeAspects(text, aspects);
            res.json({ aspects: result });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
