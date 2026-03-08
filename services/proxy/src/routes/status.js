"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const r = (0, express_1.Router)();
r.get('/status/health.json', (_req, res) => {
    res.json({
        services: { litellm: true, ollama: true, gateway: true },
        version: process.env.APP_VERSION || 'dev',
    });
});
r.get('/status/burndown.json', (_req, res) => {
    const now = new Date().toISOString();
    res.json({ generated_at: now, windows: { m1: {}, h1: {}, d1: {} } });
});
exports.default = r;
