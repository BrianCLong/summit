"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const playbook_defensive_example_json_1 = __importDefault(require("../fixtures/playbook.defensive.example.json"));
const validatePlaybook_1 = require("../validate/validatePlaybook");
(0, vitest_1.describe)('PG playbook validation (golden path)', () => {
    (0, vitest_1.it)('accepts a valid analytic-only playbook', () => {
        const report = (0, validatePlaybook_1.validatePlaybook)(playbook_defensive_example_json_1.default);
        (0, vitest_1.expect)(report.ok).toBe(true);
        (0, vitest_1.expect)(report.schemaErrors).toEqual([]);
        (0, vitest_1.expect)(report.semanticViolations).toEqual([]);
    });
    (0, vitest_1.it)('rejects unknown prescriptive fields via schema', () => {
        const bad = {
            ...playbook_defensive_example_json_1.default,
            recommendedNextSteps: ['do X next']
        };
        const report = (0, validatePlaybook_1.validatePlaybook)(bad);
        (0, vitest_1.expect)(report.ok).toBe(false);
        (0, vitest_1.expect)(report.schemaErrors.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('flags prescriptive language heuristics via SV', () => {
        const bad = {
            ...playbook_defensive_example_json_1.default,
            name: 'You should do this next step to achieve X'
        };
        const report = (0, validatePlaybook_1.validatePlaybook)(bad);
        (0, vitest_1.expect)(report.ok).toBe(false);
        (0, vitest_1.expect)(report.semanticViolations.some((violation) => violation.code === 'PG_SV_PRESCRIPTIVE_LANGUAGE')).toBe(true);
    });
});
