"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consentRoutes = void 0;
const express_1 = require("express");
const consentService_js_1 = require("../services/consentService.js");
exports.consentRoutes = (0, express_1.Router)();
// Record consent
exports.consentRoutes.post('/', async (req, res, next) => {
    try {
        const consent = await consentService_js_1.consentService.record(req.body);
        res.status(201).json(consent);
    }
    catch (err) {
        next(err);
    }
});
// Revoke consent
exports.consentRoutes.delete('/:id', async (req, res, next) => {
    try {
        const { reason } = req.body;
        const consent = await consentService_js_1.consentService.revoke(req.params.id, reason);
        if (!consent) {
            return res.status(404).json({ error: 'Consent not found or already revoked' });
        }
        res.json(consent);
    }
    catch (err) {
        next(err);
    }
});
// Get consents for a data subject (DSAR)
exports.consentRoutes.get('/subject/:id', async (req, res, next) => {
    try {
        const result = await consentService_js_1.consentService.handleDSAR(req.params.id);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Handle erasure request (Right to be Forgotten)
exports.consentRoutes.post('/subject/:id/erasure', async (req, res, next) => {
    try {
        const result = await consentService_js_1.consentService.handleErasureRequest(req.params.id);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Get active consents for a product
exports.consentRoutes.get('/product/:id', async (req, res, next) => {
    try {
        const consents = await consentService_js_1.consentService.findActiveByProduct(req.params.id);
        res.json(consents);
    }
    catch (err) {
        next(err);
    }
});
