"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRoutes = void 0;
const express_1 = require("express");
const transactionService_js_1 = require("../services/transactionService.js");
exports.transactionRoutes = (0, express_1.Router)();
// Initiate transaction
exports.transactionRoutes.post('/', async (req, res, next) => {
    try {
        const { productId, licenseType, usageTerms, durationDays } = req.body;
        const transaction = await transactionService_js_1.transactionService.initiate({
            buyerId: req.user.id,
            productId,
            licenseType,
            usageTerms,
            durationDays,
        });
        res.status(201).json(transaction);
    }
    catch (err) {
        next(err);
    }
});
// Get transaction by ID
exports.transactionRoutes.get('/:id', async (req, res, next) => {
    try {
        const transaction = await transactionService_js_1.transactionService.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        // Verify user is buyer or seller
        if (transaction.buyerId !== req.user.id &&
            transaction.sellerId !== req.user.providerId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(transaction);
    }
    catch (err) {
        next(err);
    }
});
// Process payment
exports.transactionRoutes.post('/:id/pay', async (req, res, next) => {
    try {
        const transaction = await transactionService_js_1.transactionService.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        if (transaction.buyerId !== req.user.id) {
            return res.status(403).json({ error: 'Only buyer can pay' });
        }
        const result = await transactionService_js_1.transactionService.processPayment(req.params.id, req.body);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Get my purchases
exports.transactionRoutes.get('/my/purchases', async (req, res, next) => {
    try {
        const { status } = req.query;
        const transactions = await transactionService_js_1.transactionService.getByBuyer(req.user.id, status);
        res.json(transactions);
    }
    catch (err) {
        next(err);
    }
});
// Get my sales (provider)
exports.transactionRoutes.get('/my/sales', async (req, res, next) => {
    try {
        const providerId = req.user.providerId;
        if (!providerId) {
            return res.status(403).json({ error: 'Must be a registered provider' });
        }
        const { status } = req.query;
        const transactions = await transactionService_js_1.transactionService.getBySeller(providerId, status);
        res.json(transactions);
    }
    catch (err) {
        next(err);
    }
});
