"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FunnelController_js_1 = require("../analytics/funnels/FunnelController.js");
const router = (0, express_1.Router)();
router.post('/funnels', FunnelController_js_1.createFunnel);
router.get('/funnels/:id/report', FunnelController_js_1.getFunnelReport);
exports.default = router;
