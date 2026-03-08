"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCohort = exports.getCohort = exports.createCohort = void 0;
const CohortEvaluator_js_1 = require("./CohortEvaluator.js");
const path_1 = __importDefault(require("path"));
const http_param_js_1 = require("../../utils/http-param.js");
// In a real app, inject config
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path_1.default.join(process.cwd(), 'logs', 'telemetry');
const evaluator = new CohortEvaluator_js_1.CohortEvaluator(LOG_DIR);
// In-memory store for definitions
const cohorts = new Map();
const createCohort = (req, res) => {
    const cohort = req.body;
    if (!cohort.id || !cohort.criteria) {
        return res.status(400).json({ error: 'Invalid cohort' });
    }
    cohorts.set(cohort.id, cohort);
    res.status(201).json(cohort);
};
exports.createCohort = createCohort;
const getCohort = (req, res) => {
    const id = (0, http_param_js_1.firstString)(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'id is required' });
    const cohort = cohorts.get(id);
    if (!cohort)
        return res.status(404).json({ error: 'Not found' });
    res.json(cohort);
};
exports.getCohort = getCohort;
const evaluateCohort = (req, res) => {
    const id = (0, http_param_js_1.firstString)(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'id is required' });
    const cohort = cohorts.get(id);
    if (!cohort)
        return res.status(404).json({ error: 'Not found' });
    try {
        const result = evaluator.evaluate(cohort);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.evaluateCohort = evaluateCohort;
