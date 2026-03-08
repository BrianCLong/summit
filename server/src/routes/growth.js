"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GrowthPlaybookService_js_1 = require("../services/GrowthPlaybookService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express_1.default.Router();
/**
 * POST /api/growth/playbook
 * Generate a personalized growth playbook
 */
router.post('/playbook', async (req, res) => {
    try {
        const profile = req.body;
        if (!profile.name || !profile.industry || !profile.challenges) {
            return res.status(400).json({ error: 'Missing required company profile fields' });
        }
        logger_js_1.default.info(`Generating growth playbook for ${profile.name}`);
        const playbook = await GrowthPlaybookService_js_1.growthPlaybookService.generatePlaybook(profile);
        res.json({ data: playbook });
    }
    catch (error) {
        logger_js_1.default.error('Failed to generate playbook', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
