"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logEventBus_js_1 = require("../logging/logEventBus.js");
const structuredLogger_js_1 = require("../logging/structuredLogger.js");
const router = (0, express_1.Router)();
router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const send = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    const heartbeat = setInterval(() => {
        res.write(':heartbeat\n\n');
    }, 15000);
    heartbeat.unref?.();
    logEventBus_js_1.logEventBus.recent(200).forEach((event) => send({ type: 'log', event }));
    structuredLogger_js_1.alertEngine.getRecentAlerts().forEach((alert) => send({ type: 'alert', alert }));
    const unsubscribeLog = logEventBus_js_1.logEventBus.subscribe((event) => send({ type: 'log', event }));
    const onAlert = (alert) => send({ type: 'alert', alert });
    structuredLogger_js_1.alertEngine.on('alert', onAlert);
    req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribeLog();
        structuredLogger_js_1.alertEngine.off('alert', onAlert);
        res.end();
    });
});
router.get('/recent', (req, res) => {
    const limit = Number(req.query.limit ?? '200');
    res.json({ logs: logEventBus_js_1.logEventBus.recent(Math.min(limit, 1000)) });
});
router.get('/alerts', (_req, res) => {
    res.json({ rules: structuredLogger_js_1.alertEngine.getRules(), recent: structuredLogger_js_1.alertEngine.getRecentAlerts() });
});
exports.default = router;
