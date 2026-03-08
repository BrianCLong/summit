"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const detector_js_1 = require("../src/drift/detector.js");
const governance_js_1 = require("../src/versioning/governance.js");
const manager_js_1 = require("../src/lanes/manager.js");
const drill_js_1 = require("../src/dr/drill.js");
const scorecard_js_1 = require("../src/reliability/scorecard.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const lanesDir = node_path_1.default.resolve(__dirname, '../tests/fixtures/lanes');
node_fs_1.default.mkdirSync(`${lanesDir}/acme`, { recursive: true });
node_fs_1.default.writeFileSync(`${lanesDir}/acme/config.json`, JSON.stringify({
    canary: { weight: 10 },
    rollback: { strategy: 'auto' },
    features: { search_v1: true },
}));
(0, vitest_1.describe)('Operational controls', () => {
    (0, vitest_1.it)('detects drift and classifies severity', () => {
        const report = (0, detector_js_1.buildDriftReport)({
            desired: { replicas: 3, securityGroup: 'sg-1' },
            runtime: { replicas: 2, securityGroup: 'sg-2', extra: true },
        });
        (0, vitest_1.expect)(report.alert).toBe(true);
        (0, vitest_1.expect)(report.summary.critical.length).toBe(1);
    });
    (0, vitest_1.it)('enforces versioning governance for breaking changes', () => {
        const previous = { version: 'v1', paths: { '/v1/resource': { get: {} } } };
        const next = { version: 'v1', paths: { '/v1/resource': {} } };
        const validation = (0, governance_js_1.validateVersioningChange)({ previous, next });
        (0, vitest_1.expect)(validation.breaking).toBe(true);
        const changelog = (0, governance_js_1.generateChangelogEntry)({ previous, next: { ...next, version: 'v2' } });
        (0, vitest_1.expect)(changelog.breaking).toBe(true);
    });
    (0, vitest_1.it)('blocks unsafe lane overrides and audits promotions', () => {
        const manager = new manager_js_1.LaneManager({ basePath: lanesDir, auditLog: [] });
        const promotion = manager.promote('acme', '1.2.3');
        (0, vitest_1.expect)(manager.auditLog).toHaveLength(1);
        (0, vitest_1.expect)(promotion.canary.weight).toBe(10);
    });
    (0, vitest_1.it)('evaluates DR drills against tier targets', () => {
        const targets = {
            tier0: { rpoMinutes: 5, rtoMinutes: 30 },
            tier1: { rpoMinutes: 15, rtoMinutes: 60 },
            tier2: { rpoMinutes: 60, rtoMinutes: 240 },
        };
        const result = (0, drill_js_1.evaluateDrill)({
            tier: 'tier0',
            start: new Date('2025-09-01T00:00:00Z'),
            finish: new Date('2025-09-01T00:25:00Z'),
            targets,
        });
        (0, vitest_1.expect)(result.metRto).toBe(true);
        (0, vitest_1.expect)((0, drill_js_1.runSyntheticChecks)([() => true, () => true])).toBe(true);
    });
    (0, vitest_1.it)('generates reliability scorecards with actions', () => {
        const rubric = {
            tier0: { weights: { slo: 0.5, mttr: 0.3, change: 0.2 }, targets: { mttrHours: 1 } },
            tier1: { weights: { slo: 0.4, mttr: 0.4, change: 0.2 }, targets: { mttrHours: 2 } },
        };
        const scorecards = (0, scorecard_js_1.computeScorecard)([
            { name: 'search', tier: 'tier0', sloBurnRate: 1.5, mttrHours: 0.5, changeFailRate: 0.1 },
            { name: 'ui', tier: 'tier1', sloBurnRate: 0.5, mttrHours: 3, changeFailRate: 0.2 },
        ], rubric);
        (0, vitest_1.expect)(scorecards[0].actions).toContain('freeze releases');
        (0, vitest_1.expect)(scorecards[1].actions).toContain('mandate canary');
    });
});
