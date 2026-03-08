"use strict";
/**
 * Summarization routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSummaryRouter = createSummaryRouter;
const express_1 = require("express");
const language_models_1 = require("@intelgraph/language-models");
function createSummaryRouter() {
    const router = (0, express_1.Router)();
    const summarizer = new language_models_1.Summarizer();
    /**
     * POST /api/summarization/extractive
     * Extractive summarization
     */
    router.post('/extractive', async (req, res, next) => {
        try {
            const { text, maxSentences = 3 } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            const result = await summarizer.extractive(text, maxSentences);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /api/summarization/abstractive
     * Abstractive summarization
     */
    router.post('/abstractive', async (req, res, next) => {
        try {
            const { text, maxLength = 150 } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            const result = await summarizer.abstractive(text, maxLength);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
