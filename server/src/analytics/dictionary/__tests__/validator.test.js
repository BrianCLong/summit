"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const validator_js_1 = require("../validator.js");
const DICT_PATH = path_1.default.join(path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url)), '../metrics.yaml');
(0, globals_1.describe)('Metric Validator', () => {
    const validator = new validator_js_1.MetricValidator(DICT_PATH);
    (0, globals_1.it)('should validate the metrics.yaml schema', () => {
        const errors = validator.validate();
        (0, globals_1.expect)(errors).toEqual([]);
    });
    (0, globals_1.it)('should fail if event is undocumented', () => {
        const emitted = ['page_view', 'unknown_event'];
        const errors = validator.validateCoverage(emitted);
        (0, globals_1.expect)(errors.length).toBe(1);
        (0, globals_1.expect)(errors[0]).toContain('unknown_event');
    });
    (0, globals_1.it)('should pass if all events are documented', () => {
        const emitted = ['page_view', 'api_call'];
        const errors = validator.validateCoverage(emitted);
        (0, globals_1.expect)(errors).toEqual([]);
    });
});
