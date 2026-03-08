"use strict";
/**
 * Topic modeling routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTopicRouter = createTopicRouter;
const express_1 = require("express");
const text_analytics_1 = require("@intelgraph/text-analytics");
function createTopicRouter() {
    const router = (0, express_1.Router)();
    const topicModeler = new text_analytics_1.TopicModeler();
    const clusterer = new text_analytics_1.DocumentClusterer();
    /**
     * POST /api/topics/lda
     * LDA topic modeling
     */
    router.post('/lda', async (req, res, next) => {
        try {
            const { documents, numTopics = 10 } = req.body;
            if (!documents || !Array.isArray(documents)) {
                return res.status(400).json({ error: 'Documents array is required' });
            }
            const topics = topicModeler.lda(documents, numTopics);
            res.json({ topics });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /api/topics/cluster
     * Document clustering
     */
    router.post('/cluster', async (req, res, next) => {
        try {
            const { documents, k = 5 } = req.body;
            if (!documents || !Array.isArray(documents)) {
                return res.status(400).json({ error: 'Documents array is required' });
            }
            const clusters = clusterer.kmeans(documents, k);
            res.json({ clusters });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
