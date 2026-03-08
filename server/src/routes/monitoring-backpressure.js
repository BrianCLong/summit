"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BackpressureController_js_1 = require("../runtime/backpressure/BackpressureController.js");
const router = (0, express_1.Router)();
router.get('/metrics/backpressure', (req, res) => {
    const controller = BackpressureController_js_1.BackpressureController.getInstance();
    const metrics = controller.getMetrics();
    res.json(metrics);
});
exports.default = router;
