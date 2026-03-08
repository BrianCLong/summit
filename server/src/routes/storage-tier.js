"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const StorageTierRecommenderService_js_1 = require("../services/StorageTierRecommenderService.js");
const errors_js_1 = require("../lib/errors.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express_1.default.Router();
/**
 * POST /api/storage/recommend
 * Recommend storage tier based on workload characteristics
 */
router.post('/recommend', async (req, res, next) => {
    try {
        const validationResult = StorageTierRecommenderService_js_1.WorkloadSpecsSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new errors_js_1.AppError('Invalid workload specifications', 400, { details: validationResult.error.format() });
        }
        const recommendation = StorageTierRecommenderService_js_1.storageTierRecommender.recommendStorageTier(validationResult.data);
        res.json({
            success: true,
            data: recommendation
        });
    }
    catch (error) {
        logger_js_1.default.error('Error in storage recommendation', error);
        next(error);
    }
});
exports.default = router;
