"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_js_1 = require("../config/logger.js");
const router = express_1.default.Router();
router.get('/status', (req, res) => {
    res.json({
        status: 'ready',
        mode: process.env.DEMO_MODE === '1' ? 'demo' : 'production',
        db: 'connected' // Fake for now
    });
});
router.post('/seed', async (req, res) => {
    logger_js_1.logger.info('Demo seed requested');
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    res.json({ status: 'seeded', duration: '1s' });
});
router.post('/reset', async (req, res) => {
    logger_js_1.logger.info('Demo reset requested');
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    res.json({ status: 'reset' });
});
exports.default = router;
