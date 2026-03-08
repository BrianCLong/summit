"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const CognitiveMapperService_js_1 = require("../services/CognitiveMapperService.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express_1.default.Router();
const service = CognitiveMapperService_js_1.CognitiveMapperService.getInstance();
// Validation Schemas
const PropagationSchema = zod_1.z.object({
    startNodeId: zod_1.z.string(),
    narrativeStrength: zod_1.z.number().min(0).max(1).default(1.0),
    steps: zod_1.z.number().min(1).max(10).default(3)
});
const AmplifierSchema = zod_1.z.object({
    investigationId: zod_1.z.string()
});
const ForecastSchema = zod_1.z.object({
    nodeId: zod_1.z.string(),
    timeSteps: zod_1.z.number().min(1).max(20).default(5)
});
/**
 * @route POST /api/cognitive/map-propagation
 * @desc Simulates narrative propagation
 * @access Private
 */
router.post('/map-propagation', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { startNodeId, narrativeStrength, steps } = PropagationSchema.parse(req.body);
        const tenantId = req.user?.tenantId;
        const result = await service.simulatePropagation(startNodeId, narrativeStrength, steps, tenantId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        logger_js_1.default.error('Error in map-propagation:', error);
        res.status(500).json({ error: 'Failed to map propagation' });
    }
});
/**
 * @route POST /api/cognitive/amplifiers
 * @desc Detects amplification nodes in an investigation
 * @access Private
 */
router.post('/amplifiers', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { investigationId } = AmplifierSchema.parse(req.body);
        const tenantId = req.user?.tenantId;
        const amplifiers = await service.detectAmplifiers(investigationId, tenantId);
        res.json({ amplifiers });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        logger_js_1.default.error('Error in amplifiers:', error);
        res.status(500).json({ error: 'Failed to detect amplifiers' });
    }
});
/**
 * @route POST /api/cognitive/forecast-opinion
 * @desc Forecasts opinion shift for a node
 * @access Private
 */
router.post('/forecast-opinion', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { nodeId, timeSteps } = ForecastSchema.parse(req.body);
        const tenantId = req.user?.tenantId;
        const forecast = await service.forecastOpinionShift(nodeId, timeSteps, tenantId);
        res.json(forecast);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        logger_js_1.default.error('Error in forecast-opinion:', error);
        res.status(500).json({ error: 'Failed to forecast opinion' });
    }
});
exports.default = router;
