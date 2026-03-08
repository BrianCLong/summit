"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../src/pits/engine.js");
const defaultScenario_js_1 = require("../src/pits/defaultScenario.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('PrivacyIncidentDrillEngine', () => {
    (0, globals_1.it)('produces deterministic outputs when the seed is fixed', () => {
        const seed = 42;
        const engineA = new engine_js_1.PrivacyIncidentDrillEngine(defaultScenario_js_1.defaultScenario);
        const engineB = new engine_js_1.PrivacyIncidentDrillEngine(defaultScenario_js_1.defaultScenario);
        const reportA = engineA.run(seed);
        const reportB = engineB.run(seed);
        (0, globals_1.expect)(reportA.timeline).toEqual(reportB.timeline);
        (0, globals_1.expect)(reportA.integrations).toEqual(reportB.integrations);
        (0, globals_1.expect)(reportA.score).toBe(reportB.score);
    });
    (0, globals_1.it)('produces artifacts for each integration and tracks evidence metrics', () => {
        const engine = new engine_js_1.PrivacyIncidentDrillEngine(defaultScenario_js_1.defaultScenario);
        const report = engine.run(99);
        (0, globals_1.expect)(report.integrations.IAB.totalArtifacts).toBeGreaterThan(0);
        (0, globals_1.expect)(report.integrations.IDTL.totalArtifacts).toBeGreaterThan(0);
        const totalArtifacts = report.integrations.IAB.totalArtifacts +
            report.integrations.IDTL.totalArtifacts;
        (0, globals_1.expect)(report.metrics.evidenceRequests).toBe(totalArtifacts);
        (0, globals_1.expect)(report.metrics.averageTimeToEvidenceHours).toBeGreaterThan(0);
    });
    (0, globals_1.it)('flags SLA breaches with actionable remediation guidance', () => {
        const engine = new engine_js_1.PrivacyIncidentDrillEngine(defaultScenario_js_1.defaultScenario);
        const report = engine.run(1337);
        (0, globals_1.expect)(report.slaBreaches.length).toBeGreaterThan(0);
        for (const breach of report.slaBreaches) {
            (0, globals_1.expect)(breach.recommendedAction).toMatch(/\d+(\.\d+)?h/);
            const matchingTimeline = report.timeline.find((entry) => entry.eventId === breach.eventId);
            (0, globals_1.expect)(matchingTimeline?.status).toBe('breached');
        }
    });
});
