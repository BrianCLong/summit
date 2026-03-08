"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
exports.healthRouter.get('/readyz', (_req, res) => {
    res.status(200).json({ status: 'ready' });
});
