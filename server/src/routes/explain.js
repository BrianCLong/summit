"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExplainabilityService_js_1 = require("../services/ExplainabilityService.js");
const ExplanationBookmarkService_js_1 = require("../services/ExplanationBookmarkService.js");
const router = (0, express_1.Router)();
// GET /api/explain/node/:id
router.get('/node/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ExplainabilityService_js_1.explainabilityService.explainNode(id);
        res.json(result);
    }
    catch (error) {
        // If node not found
        if (error.message === 'Node not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});
// POST /api/explain/bookmarks
router.post('/bookmarks', async (req, res) => {
    try {
        const { explanation } = req.body;
        if (!explanation) {
            return res.status(400).json({ error: 'Explanation data is required' });
        }
        const result = await ExplanationBookmarkService_js_1.explanationBookmarkService.saveBookmark(explanation);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/explain/bookmarks/:id
router.get('/bookmarks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const explanation = await ExplanationBookmarkService_js_1.explanationBookmarkService.getBookmark(id);
        if (!explanation) {
            return res.status(404).json({ error: 'Bookmark not found' });
        }
        res.json(explanation);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
