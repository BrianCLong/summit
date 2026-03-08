"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskRoutes = void 0;
const express_1 = require("express");
const riskScorerService_js_1 = require("../services/riskScorerService.js");
const productService_js_1 = require("../services/productService.js");
exports.riskRoutes = (0, express_1.Router)();
// Assess dataset risk (preview before publishing)
exports.riskRoutes.post('/assess', async (req, res, next) => {
    try {
        // Create a temporary product-like object for assessment
        const tempProduct = {
            id: `temp-${Date.now()}`,
            providerId: req.user.providerId || req.user.id,
            ...req.body,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const assessment = await riskScorerService_js_1.riskScorerService.assess(tempProduct);
        res.json(assessment);
    }
    catch (err) {
        next(err);
    }
});
// Get risk report for a product
exports.riskRoutes.get('/report/:productId', async (req, res, next) => {
    try {
        const product = await productService_js_1.productService.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const assessment = await riskScorerService_js_1.riskScorerService.getByProductId(req.params.productId);
        if (!assessment) {
            // Generate new assessment if none exists
            const newAssessment = await riskScorerService_js_1.riskScorerService.assess(product);
            return res.json(newAssessment);
        }
        res.json(assessment);
    }
    catch (err) {
        next(err);
    }
});
