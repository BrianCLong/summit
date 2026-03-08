"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const vitest_1 = require("vitest");
const runner_js_1 = require("./runner.js");
const here = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const compliantRoot = path_1.default.join(here, '..', 'test-fixtures', 'compliant');
const noncompliantRoot = path_1.default.join(here, '..', 'test-fixtures', 'noncompliant');
const filterFailures = (results) => results.filter((result) => result.status === 'fail');
(0, vitest_1.describe)('security defense checks', () => {
    (0, vitest_1.it)('passes for compliant fixtures', () => {
        const results = (0, runner_js_1.runAllChecks)({ rootDir: compliantRoot, now: new Date('2025-08-25') });
        const summary = (0, runner_js_1.summarizeResults)(results);
        (0, vitest_1.expect)(filterFailures(results)).toHaveLength(0);
        (0, vitest_1.expect)(summary.score).toBe(100);
    });
    (0, vitest_1.it)('surfaces failures for noncompliant fixtures', () => {
        const results = (0, runner_js_1.runAllChecks)({ rootDir: noncompliantRoot, now: new Date('2025-08-25') });
        const failures = filterFailures(results);
        const failingRequirements = failures.map((failure) => failure.requirement);
        (0, vitest_1.expect)(failingRequirements).toContain('Workflow permissions');
        (0, vitest_1.expect)(failingRequirements).toContain('Pinned actions');
        (0, vitest_1.expect)(failingRequirements).toContain('Secret scanning');
        (0, vitest_1.expect)(failingRequirements).toContain('Rotation cadence');
        (0, vitest_1.expect)(failingRequirements).toContain('Run as non-root');
        (0, vitest_1.expect)(failingRequirements).toContain('No wildcard admin');
    });
});
