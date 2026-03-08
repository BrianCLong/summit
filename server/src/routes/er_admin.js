"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const EntityResolutionService_js_1 = require("../services/EntityResolutionService.js");
const pino_1 = __importDefault(require("pino"));
const router = express_1.default.Router();
const logger = pino_1.default({ name: 'ERAdminRoutes' });
const erService = new EntityResolutionService_js_1.EntityResolutionService();
// POST /admin/er/evaluate
router.post('/evaluate', async (req, res) => {
    try {
        // In a real scenario, golden set is loaded from a file or DB
        // For MVP/Sprint, we define a small static set or load from a known location
        const goldenSet = [
            { id1: 'e1', id2: 'e2', isMatch: true },
            { id1: 'e3', id2: 'e4', isMatch: false }
        ];
        const metrics = await erService.evaluateModel(goldenSet);
        // Log metrics for observability
        logger.info({ metrics }, 'ER Evaluation Completed');
        res.json(metrics);
    }
    catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'ER Evaluation Failed');
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
exports.default = router;
