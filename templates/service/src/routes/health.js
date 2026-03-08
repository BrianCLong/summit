"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
router.get('/ready', (req, res) => {
    // Add readiness checks here (e.g., db connection)
    res.status(200).json({ status: 'ready' });
});
exports.default = router;
