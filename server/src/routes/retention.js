"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RetentionController_js_1 = require("../analytics/retention/RetentionController.js");
const router = (0, express_1.Router)();
router.post('/analytics/retention/run', RetentionController_js_1.runRetention);
router.get('/analytics/retention/jobs/:id', RetentionController_js_1.getJobStatus);
exports.default = router;
