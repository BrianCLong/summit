"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const InfluenceOperationsService_js_1 = require("../services/InfluenceOperationsService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
// Apply auth middleware
router.use(auth_js_1.ensureAuthenticated);
/**
 * @route GET /api/influence-operations/detect/:campaignId
 * @desc Run influence operation detection pipeline
 */
router.get('/detect/:campaignId', async (req, res, next) => {
    try {
        const service = InfluenceOperationsService_js_1.InfluenceOperationsService.getInstance();
        const result = await service.detectInfluenceOperations(req.params.campaignId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/influence-operations/narrative/:id/timeline
 * @desc Get narrative evolution timeline
 */
router.get('/narrative/:id/timeline', async (req, res, next) => {
    try {
        const service = InfluenceOperationsService_js_1.InfluenceOperationsService.getInstance();
        const result = await service.getNarrativeTimeline(req.params.id);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/influence-operations/narrative/:id/network
 * @desc Get influence network analysis
 */
router.get('/narrative/:id/network', async (req, res, next) => {
    try {
        const service = InfluenceOperationsService_js_1.InfluenceOperationsService.getInstance();
        const result = await service.getInfluenceNetwork(req.params.id);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
