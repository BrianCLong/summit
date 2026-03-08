"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExperimentController_js_1 = require("../analytics/experiments/ExperimentController.js");
const router = (0, express_1.Router)();
// Admin endpoints (in real app, protect with admin role middleware)
router.post('/experiments', ExperimentController_js_1.createExperiment);
router.get('/experiments', ExperimentController_js_1.listExperiments);
router.post('/experiments/:id/stop', ExperimentController_js_1.stopExperiment);
// User endpoint for assignment
router.get('/experiments/:id/assignment', ExperimentController_js_1.getAssignment);
exports.default = router;
