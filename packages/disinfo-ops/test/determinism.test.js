"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const deterministic_json_js_1 = require("../src/lib/deterministic_json.js");
const evidence_id_js_1 = require("../src/lib/evidence_id.js");
const ajv_1 = __importDefault(require("ajv"));
const report_schema_json_1 = __importDefault(require("../schemas/report.schema.json"));
(0, vitest_1.describe)('Disinfo Ops Determinism', () => {
    (0, vitest_1.it)('should stringify JSON consistently regardless of key order', () => {
        const obj1 = { a: 1, b: 2, c: { d: 3, e: 4 } };
        const obj2 = { b: 2, a: 1, c: { e: 4, d: 3 } };
        (0, vitest_1.expect)((0, deterministic_json_js_1.stableStringify)(obj1)).toBe((0, deterministic_json_js_1.stableStringify)(obj2));
    });
    (0, vitest_1.it)('should generate valid Evidence IDs', () => {
        const id = (0, evidence_id_js_1.generateEvidenceId)();
        (0, vitest_1.expect)(id).toMatch(/^EVD-OPS-\d{14}-[0-9A-F]{8}$/);
    });
    (0, vitest_1.it)('should validate report schema', () => {
        const ajv = new ajv_1.default();
        const validate = ajv.compile(report_schema_json_1.default);
        const validReport = {
            evidence_id: 'EVD-TEST-001',
            job_id: 'JOB-001',
            verdict: 'UNCLEAR',
            summary: 'Test summary',
            limitations: ['Test limitation'],
            claims: [{ text: 'Test claim', status: 'pending' }]
        };
        const valid = validate(validReport);
        if (!valid)
            console.log(validate.errors);
        (0, vitest_1.expect)(valid).toBe(true);
    });
});
