"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GraphIndexAdvisorService_js_1 = __importDefault(require("../services/GraphIndexAdvisorService.js"));
const router = express_1.default.Router();
// Get index recommendations
router.get('/recommendations', async (req, res) => {
    try {
        const advisor = GraphIndexAdvisorService_js_1.default.getInstance();
        const recommendations = await advisor.getRecommendations();
        const stats = advisor.getStats();
        res.json({
            data: recommendations,
            meta: stats
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});
exports.default = router;
