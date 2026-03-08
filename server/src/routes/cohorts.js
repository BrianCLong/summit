"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CohortController_js_1 = require("../analytics/cohorts/CohortController.js");
const router = (0, express_1.Router)();
// Admin only (assumed via mounting or future middleware)
router.post('/cohorts', CohortController_js_1.createCohort);
router.get('/cohorts/:id', CohortController_js_1.getCohort);
router.post('/cohorts/:id/evaluate', CohortController_js_1.evaluateCohort);
exports.default = router;
