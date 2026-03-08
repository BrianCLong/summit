"use strict";
/**
 * Glossary API Routes
 * Endpoints for business glossary management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.glossaryRouter = void 0;
const express_1 = require("express");
exports.glossaryRouter = (0, express_1.Router)();
// Placeholder routes - implement controllers as needed
exports.glossaryRouter.get('/terms', (req, res) => {
    res.json({ message: 'Get all terms' });
});
exports.glossaryRouter.post('/terms', (req, res) => {
    res.json({ message: 'Create term' });
});
exports.glossaryRouter.get('/categories', (req, res) => {
    res.json({ message: 'Get all categories' });
});
