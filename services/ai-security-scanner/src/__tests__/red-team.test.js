"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const red_team_engine_js_1 = require("../redteam/red-team-engine.js");
(0, vitest_1.describe)('RedTeamEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new red_team_engine_js_1.RedTeamEngine({
            enabled: true,
            attackCategories: ['authentication-bypass', 'injection-attacks'],
            maxAttemptsPerVector: 1,
            safeModeEnabled: true,
            reportOnly: true,
        });
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should create engine with config', () => {
            (0, vitest_1.expect)(engine).toBeDefined();
        });
        (0, vitest_1.it)('should accept custom attack categories', () => {
            const customEngine = new red_team_engine_js_1.RedTeamEngine({
                attackCategories: ['business-logic', 'rate-limiting'],
            });
            (0, vitest_1.expect)(customEngine).toBeDefined();
        });
    });
    (0, vitest_1.describe)('red team session', () => {
        (0, vitest_1.it)('should execute red team session', async () => {
            const report = await engine.executeRedTeamSession({
                basePath: '/tmp/test',
                endpoints: [],
                policies: [],
            });
            (0, vitest_1.expect)(report.sessionId).toBeDefined();
            (0, vitest_1.expect)(report.startTime).toBeInstanceOf(Date);
            (0, vitest_1.expect)(report.endTime).toBeInstanceOf(Date);
            (0, vitest_1.expect)(report.riskAssessment).toBeDefined();
            (0, vitest_1.expect)(report.riskAssessment.overallRisk).toBeDefined();
        });
        (0, vitest_1.it)('should generate recommendations', async () => {
            const report = await engine.executeRedTeamSession({
                basePath: '/tmp/test',
            });
            (0, vitest_1.expect)(Array.isArray(report.recommendations)).toBe(true);
        });
        (0, vitest_1.it)('should track attack results', async () => {
            const report = await engine.executeRedTeamSession({
                basePath: '/tmp/test',
            });
            (0, vitest_1.expect)(Array.isArray(report.attackResults)).toBe(true);
            (0, vitest_1.expect)(report.attacksExecuted).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('safe mode', () => {
        (0, vitest_1.it)('should skip destructive vectors in safe mode', async () => {
            const safeEngine = new red_team_engine_js_1.RedTeamEngine({
                safeModeEnabled: true,
                reportOnly: true,
            });
            const report = await safeEngine.executeRedTeamSession({
                basePath: '/tmp/test',
            });
            // Should complete without attempting destructive attacks
            (0, vitest_1.expect)(report.sessionId).toBeDefined();
        });
    });
    (0, vitest_1.describe)('risk assessment', () => {
        (0, vitest_1.it)('should calculate risk scores', async () => {
            const report = await engine.executeRedTeamSession({
                basePath: '/tmp/test',
            });
            const risk = report.riskAssessment;
            (0, vitest_1.expect)(risk.attackSurfaceScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(risk.exploitabilityScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(risk.impactScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(risk.mitigationEffectiveness).toBeGreaterThanOrEqual(0);
        });
    });
});
