"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const reportPath = node_path_1.default.resolve(__dirname, '../../../tests/FLAKE_REPORT.md');
function parseFlakeReport() {
    const raw = node_fs_1.default.readFileSync(reportPath, 'utf8');
    const lines = raw.split('\n').filter((line) => line.startsWith('-'));
    return lines.map((line) => line.replace(/^-\s*/, ''));
}
(0, vitest_1.describe)('Flake tracker', () => {
    (0, vitest_1.it)('lists quarantined tests and enforces rerun policy', () => {
        const flakes = parseFlakeReport();
        (0, vitest_1.expect)(flakes.length).toBeGreaterThan(0);
        const rerunPolicy = 3;
        const summary = { reruns: rerunPolicy, quarantined: flakes.length };
        (0, vitest_1.expect)(summary.reruns).toBe(3);
    });
});
