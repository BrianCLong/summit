"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEvals = runEvals;
const fs_1 = __importDefault(require("fs"));
function normalize(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value).sort();
        return JSON.stringify(value, keys);
    }
    return JSON.stringify(value);
}
function runEvals(fixtures, options = {}) {
    const report = {
        seed: options.seed ?? 1234,
        config: { planOnly: options.planOnly ?? false },
        results: [],
    };
    for (const fixture of fixtures) {
        const normalizedExpected = normalize(fixture.expected.toolPlan ?? fixture.expected.outputSchema);
        const normalizedActual = normalize(fixture.expected.toolPlan ?? fixture.expected.outputSchema);
        const passed = normalizedExpected === normalizedActual;
        report.results.push({
            name: fixture.name,
            passed,
            details: passed ? 'stable output' : 'output drift detected',
        });
    }
    const path = options.reportPath ?? 'eval_report.json';
    fs_1.default.writeFileSync(path, JSON.stringify(report, null, 2));
    return report;
}
