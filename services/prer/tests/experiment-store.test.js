"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const store_js_1 = require("../src/store.js");
const exporter_js_1 = require("../src/exporter.js");
const actor = 'qa@prer';
const stopRule = { maxDurationDays: 14, maxUnits: 10000 };
const analysisPlan = {
    method: 'difference-in-proportions',
    alpha: 0.05,
    desiredPower: 0.8
};
const metrics = [
    { name: 'activation_rate', baselineRate: 0.1, minDetectableEffect: 0.02 }
];
(0, vitest_1.describe)('ExperimentStore', () => {
    (0, vitest_1.it)('rejects hypothesis changes after experiment start and logs audit entries', () => {
        const store = new store_js_1.ExperimentStore();
        const experiment = store.createExperiment({
            name: 'Onboarding funnel',
            hypothesis: 'Shorter form improves activation',
            metrics,
            stopRule,
            analysisPlan
        }, actor);
        store.startExperiment(experiment.id, actor);
        (0, vitest_1.expect)(() => store.attemptHypothesisUpdate(experiment.id, 'Different hypothesis', 'malicious@corp')).toThrowError('Hypothesis changes are locked once the experiment has started.');
        const auditLog = store.getExperiment(experiment.id).auditLog;
        const rejection = auditLog.find((entry) => entry.action === 'UPDATE_HYPOTHESIS');
        (0, vitest_1.expect)(rejection).toBeDefined();
        (0, vitest_1.expect)(rejection?.status).toBe('REJECTED');
        (0, vitest_1.expect)(rejection?.actor).toBe('malicious@corp');
    });
    (0, vitest_1.it)('blocks ingestion for unregistered metrics', () => {
        const store = new store_js_1.ExperimentStore();
        const experiment = store.createExperiment({
            name: 'Pricing page',
            hypothesis: 'New layout improves conversion',
            metrics,
            stopRule,
            analysisPlan
        }, actor);
        (0, vitest_1.expect)(() => store.addResult(experiment.id, 'revenue', { variant: 'B', value: 42 }, actor)).toThrowError('Metric revenue is not registered for this experiment.');
    });
    (0, vitest_1.it)('produces exports that can be verified offline', () => {
        const store = new store_js_1.ExperimentStore();
        const experiment = store.createExperiment({
            name: 'Copy test',
            hypothesis: 'Button copy increases clicks',
            metrics,
            stopRule,
            analysisPlan
        }, actor);
        const bundle = (0, exporter_js_1.buildExportBundle)(experiment);
        const offlineDigest = (0, exporter_js_1.createExportDigest)(bundle.payload);
        (0, vitest_1.expect)(bundle.digest).toEqual(offlineDigest);
    });
});
