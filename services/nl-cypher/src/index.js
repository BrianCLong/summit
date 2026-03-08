"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const estimator_js_1 = require("./estimator.js");
const executor_js_1 = require("./executor.js");
const sanitizer_js_1 = require("./sanitizer.js");
const translator_js_1 = require("./translator.js");
const validator_js_1 = require("./validator.js");
const diff_js_1 = require("./diff.js");
exports.router = express_1.default.Router();
exports.router.post('/translate', (req, res) => {
    const { prompt } = req.body;
    const translation = (0, translator_js_1.translate)(prompt);
    const sanitized = (0, sanitizer_js_1.sanitizeCypher)(translation.cypher);
    const diff = (0, diff_js_1.diffQueries)(translation.cypher, sanitized.cleaned);
    const { valid, warnings } = (0, validator_js_1.validateCypher)(sanitized.cleaned);
    const response = {
        cypher: sanitized.cleaned,
        sqlFallback: translation.sqlFallback,
        confidence: translation.confidence,
        warnings: [...translation.warnings, ...sanitized.warnings, ...warnings],
        diff,
    };
    console.info('[nl-cypher] translate trace', translation.reasoningTrace.join(' | '));
    res.json(response);
});
exports.router.post('/estimate', (req, res) => {
    const { prompt } = req.body;
    const result = (0, estimator_js_1.estimate)(prompt);
    res.json(result);
});
exports.router.post('/sandbox/run', (req, res) => {
    const { prompt } = req.body;
    const result = (0, executor_js_1.sandboxRun)(prompt);
    res.json(result);
});
exports.default = exports.router;
