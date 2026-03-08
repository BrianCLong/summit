"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = require("express");
const productService_js_1 = require("../services/productService.js");
const riskScorerService_js_1 = require("../services/riskScorerService.js");
const types_js_1 = require("../models/types.js");
exports.productRoutes = (0, express_1.Router)();
// Search products
exports.productRoutes.get('/', async (req, res, next) => {
    try {
        const { query, category, maxRiskLevel, limit, offset } = req.query;
        const result = await productService_js_1.productService.search({
            query: query,
            category: category,
            maxRiskLevel: maxRiskLevel,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Get product by ID
exports.productRoutes.get('/:id', async (req, res, next) => {
    try {
        const product = await productService_js_1.productService.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (err) {
        next(err);
    }
});
// Create product
exports.productRoutes.post('/', async (req, res, next) => {
    try {
        const input = types_js_1.CreateProductInput.parse(req.body);
        const providerId = req.user.providerId;
        if (!providerId) {
            return res.status(403).json({ error: 'Must be a registered provider' });
        }
        const product = await productService_js_1.productService.create(providerId, input);
        res.status(201).json(product);
    }
    catch (err) {
        next(err);
    }
});
// Publish product
exports.productRoutes.post('/:id/publish', async (req, res, next) => {
    try {
        const providerId = req.user.providerId;
        if (!providerId) {
            return res.status(403).json({ error: 'Must be a registered provider' });
        }
        const product = await productService_js_1.productService.publish(req.params.id, providerId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (err) {
        next(err);
    }
});
// Get compliance/risk report
exports.productRoutes.get('/:id/compliance', async (req, res, next) => {
    try {
        const assessment = await riskScorerService_js_1.riskScorerService.getByProductId(req.params.id);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }
        res.json(assessment);
    }
    catch (err) {
        next(err);
    }
});
// Get my listings (provider)
exports.productRoutes.get('/my/listings', async (req, res, next) => {
    try {
        const providerId = req.user.providerId;
        if (!providerId) {
            return res.status(403).json({ error: 'Must be a registered provider' });
        }
        const products = await productService_js_1.productService.getByProvider(providerId);
        res.json(products);
    }
    catch (err) {
        next(err);
    }
});
