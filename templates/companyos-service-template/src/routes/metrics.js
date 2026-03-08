"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRouter = void 0;
const express_1 = require("express");
const metrics_js_1 = require("../observability/metrics.js");
exports.metricsRouter = (0, express_1.Router)();
exports.metricsRouter.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metrics_js_1.register.contentType);
    res.end(await metrics_js_1.register.metrics());
});
