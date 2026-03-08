"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const SearchIndexService_js_1 = require("../search-index/SearchIndexService.js");
const logger_js_1 = require("../config/logger.js");
const router = express_1.default.Router();
router.post('/query', async (req, res) => {
    try {
        const input = req.body;
        // Validate caseId
        if (!input.caseId) {
            return res.status(400).json({ error: 'caseId is required' });
        }
        const results = SearchIndexService_js_1.SearchIndexService.getInstance().search(input);
        res.json({ results });
    }
    catch (err) {
        logger_js_1.logger.error('Search query failed', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/reindex', async (req, res) => {
    // Admin/Dev only check would go here (middleware)
    try {
        const { caseId } = req.body;
        await SearchIndexService_js_1.SearchIndexService.getInstance().reindex(caseId);
        res.json({ status: 'Reindexing started' });
    }
    catch (err) {
        logger_js_1.logger.error('Reindex failed', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
