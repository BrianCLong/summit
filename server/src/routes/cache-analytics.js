"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cacheAnalytics_js_1 = require("../cache/cacheAnalytics.js");
const cacheAnalyticsRouter = (0, express_1.Router)();
cacheAnalyticsRouter.get('/analytics', async (_req, res) => {
    try {
        const analytics = await (0, cacheAnalytics_js_1.collectCacheAnalytics)();
        res.json({ status: 'ok', analytics });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
});
exports.default = cacheAnalyticsRouter;
