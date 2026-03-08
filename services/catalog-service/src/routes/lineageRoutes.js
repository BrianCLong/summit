"use strict";
/**
 * Lineage API Routes
 * Endpoints for data lineage visualization and analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineageRouter = void 0;
const express_1 = require("express");
const LineageController_js_1 = require("../controllers/LineageController.js");
exports.lineageRouter = (0, express_1.Router)();
const controller = new LineageController_js_1.LineageController();
/**
 * GET /api/v1/lineage/:assetId
 * Get lineage graph for asset
 */
exports.lineageRouter.get('/:assetId', async (req, res, next) => {
    try {
        await controller.getLineage(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/lineage/:assetId/upstream
 * Get upstream lineage
 */
exports.lineageRouter.get('/:assetId/upstream', async (req, res, next) => {
    try {
        await controller.getUpstreamLineage(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/lineage/:assetId/downstream
 * Get downstream lineage
 */
exports.lineageRouter.get('/:assetId/downstream', async (req, res, next) => {
    try {
        await controller.getDownstreamLineage(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/lineage/:assetId/impact
 * Analyze impact of changes
 */
exports.lineageRouter.get('/:assetId/impact', async (req, res, next) => {
    try {
        await controller.analyzeImpact(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/lineage/:assetId/column/:columnName
 * Get column-level lineage
 */
exports.lineageRouter.get('/:assetId/column/:columnName', async (req, res, next) => {
    try {
        await controller.getColumnLineage(req, res);
    }
    catch (error) {
        next(error);
    }
});
