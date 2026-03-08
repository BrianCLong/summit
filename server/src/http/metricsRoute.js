"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRoute = void 0;
const metrics_js_1 = require("../monitoring/metrics.js");
const logger_js_1 = require("../config/logger.js");
const metricsRoute = async (_req, res) => {
    try {
        res.set('Content-Type', metrics_js_1.register.contentType);
        const metrics = await metrics_js_1.register.metrics();
        res.send(metrics);
    }
    catch (err) {
        logger_js_1.logger.error({ err }, 'Error generating metrics');
        res.status(500).send('Error generating metrics');
    }
};
exports.metricsRoute = metricsRoute;
