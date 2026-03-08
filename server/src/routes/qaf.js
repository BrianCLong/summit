"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const factory_js_1 = require("../qaf/factory.js");
const router = express_1.default.Router();
const factory = new factory_js_1.SummitQAF();
/**
 * @api {post} /api/qaf/spawn Spawn a new agent
 * @apiGroup QAF
 */
router.post('/spawn', async (req, res) => {
    try {
        const config = req.body;
        // Default to quantum-secure if not specified, for "Quantum-Ready" prompt requirement
        if (!config.securityLevel) {
            config.securityLevel = 'quantum-secure';
        }
        const identity = await factory.spawnAgent(config);
        res.json(identity);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to spawn agent' });
    }
});
/**
 * @api {get} /api/qaf/telemetry Get ROI telemetry
 * @apiGroup QAF
 */
router.get('/telemetry', (req, res) => {
    res.json(factory.getTelemetry());
});
/**
 * @api {post} /api/qaf/scan Run quantum security scan
 * @apiGroup QAF
 */
router.post('/scan', async (req, res) => {
    const result = await factory.runQuantumScan();
    res.json(result);
});
exports.default = router;
