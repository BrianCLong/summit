"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulationTelemetry = exports.NarrativeTelemetry = void 0;
// @ts-nocheck
const node_perf_hooks_1 = require("node:perf_hooks");
const prom_client_1 = require("prom-client");
const registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: registry });
const initializations = new prom_client_1.Counter({
    name: 'narrative_sim_initializations_total',
    help: 'Number of narrative simulation initializations',
    registers: [registry],
});
const injectedEvents = new prom_client_1.Counter({
    name: 'narrative_sim_events_injected_total',
    help: 'Number of events injected into the simulation runtime',
    registers: [registry],
});
const steps = new prom_client_1.Counter({
    name: 'narrative_sim_steps_total',
    help: 'Number of simulation steps executed',
    registers: [registry],
});
const stepDuration = new prom_client_1.Histogram({
    name: 'narrative_sim_step_duration_seconds',
    help: 'Execution time for simulation steps',
    buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry],
});
const queueDepth = new prom_client_1.Gauge({
    name: 'narrative_sim_event_queue_depth',
    help: 'Current number of queued events awaiting processing',
    registers: [registry],
});
function logEvent(event, payload) {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        ...payload,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
}
class NarrativeTelemetry {
    metricRegistry;
    constructor(metricRegistry = registry) {
        this.metricRegistry = metricRegistry;
    }
    recordInitialization(observation) {
        initializations.inc();
        queueDepth.set(0);
        logEvent('narrative_init', observation);
    }
    recordInjection(observation) {
        injectedEvents.inc();
        queueDepth.set(observation.queuedEvents);
        logEvent('narrative_event_injected', observation);
    }
    recordStep(observation) {
        steps.inc();
        stepDuration.observe(observation.durationMs / 1000);
        queueDepth.set(observation.queuedEvents);
        logEvent('narrative_step', observation);
    }
    log(event, payload) {
        logEvent(event, payload);
    }
    logError(event, payload) {
        logEvent(event, { level: 'error', ...payload });
    }
    timer() {
        const start = node_perf_hooks_1.performance.now();
        return () => node_perf_hooks_1.performance.now() - start;
    }
    async metrics() {
        return this.metricRegistry.metrics();
    }
    registry() {
        return this.metricRegistry;
    }
}
exports.NarrativeTelemetry = NarrativeTelemetry;
exports.simulationTelemetry = new NarrativeTelemetry();
