"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AnomalyController_js_1 = require("../analytics/anomalies/AnomalyController.js");
const router = (0, express_1.Router)();
router.post('/anomalies/run', AnomalyController_js_1.runAnomalyDetection);
router.get('/anomalies', AnomalyController_js_1.getAnomalies);
exports.default = router;
