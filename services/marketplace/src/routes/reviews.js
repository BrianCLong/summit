"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRoutes = void 0;
const express_1 = require("express");
const reviewService_js_1 = require("../services/reviewService.js");
exports.reviewRoutes = (0, express_1.Router)();
// Submit a review
exports.reviewRoutes.post('/', async (req, res, next) => {
    try {
        const review = await reviewService_js_1.reviewService.submit({
            ...req.body,
            reviewerId: req.user.id,
        });
        res.status(201).json(review);
    }
    catch (err) {
        next(err);
    }
});
// Get reviews for a product
exports.reviewRoutes.get('/product/:productId', async (req, res, next) => {
    try {
        const { limit, offset } = req.query;
        const result = await reviewService_js_1.reviewService.findByProduct(req.params.productId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Get average rating for a product
exports.reviewRoutes.get('/product/:productId/rating', async (req, res, next) => {
    try {
        const rating = await reviewService_js_1.reviewService.getAverageRating(req.params.productId);
        if (!rating) {
            return res.json({ average: null, count: 0, distribution: {} });
        }
        res.json(rating);
    }
    catch (err) {
        next(err);
    }
});
// Mark review as helpful
exports.reviewRoutes.post('/:id/helpful', async (req, res, next) => {
    try {
        const review = await reviewService_js_1.reviewService.markHelpful(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(review);
    }
    catch (err) {
        next(err);
    }
});
// Get reviews by provider
exports.reviewRoutes.get('/provider/:providerId', async (req, res, next) => {
    try {
        const reviews = await reviewService_js_1.reviewService.findByProvider(req.params.providerId);
        res.json(reviews);
    }
    catch (err) {
        next(err);
    }
});
