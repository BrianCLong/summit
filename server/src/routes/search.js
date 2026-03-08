"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const SemanticSearchService_js_1 = __importDefault(require("../services/SemanticSearchService.js"));
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express_1.default.Router();
// Initialize the service
// In a real app, this should be a singleton or injected
const searchService = new SemanticSearchService_js_1.default();
/**
 * POST /api/search
 * Advanced hybrid search endpoint
 */
router.post('/', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { q, filters, // { status: [], dateFrom, dateTo, entityType, evidenceCategory }
        limit = 20 } = req.body;
        if (!q) {
            return res.status(400).json({ error: 'Query string is required' });
        }
        const results = await searchService.searchCases(q, filters, limit);
        res.json(results);
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Advanced search failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/search/autocomplete
 * Search suggestions
 */
router.get('/autocomplete', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const suggestions = await searchService.getAutocomplete(q, Number(limit));
        res.json(suggestions);
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Autocomplete failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
