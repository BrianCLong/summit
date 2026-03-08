"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disclosureMetrics = exports.DisclosureMetrics = void 0;
const prom_client_1 = require("prom-client");
function getOrCreateCounter(name, config) {
    const existing = prom_client_1.register.getSingleMetric(name);
    if (existing)
        return existing;
    return new prom_client_1.Counter(config);
}
function getOrCreateHistogram(name, config) {
    const existing = prom_client_1.register.getSingleMetric(name);
    if (existing)
        return existing;
    return new prom_client_1.Histogram(config);
}
function getOrCreateGauge(name, config) {
    const existing = prom_client_1.register.getSingleMetric(name);
    if (existing)
        return existing;
    return new prom_client_1.Gauge(config);
}
class DisclosureMetrics {
    static instance;
    events;
    durations;
    bundleSize;
    activeExports;
    warningCounter;
    constructor() {
        this.events = getOrCreateCounter('disclosure_packager_events_total', {
            name: 'disclosure_packager_events_total',
            help: 'Lifecycle events recorded for the disclosure packager UI and API.',
            labelNames: ['event', 'tenant'],
        });
        this.durations = getOrCreateHistogram('disclosure_packager_duration_seconds', {
            name: 'disclosure_packager_duration_seconds',
            help: 'Observed export durations in seconds.',
            labelNames: ['tenant'],
            buckets: [5, 15, 30, 60, 90, 120, 180, 240, 300, 420],
        });
        this.bundleSize = getOrCreateHistogram('disclosure_packager_bundle_bytes', {
            name: 'disclosure_packager_bundle_bytes',
            help: 'Size of completed disclosure bundles in bytes.',
            labelNames: ['tenant'],
            buckets: [
                50_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000,
            ],
        });
        this.activeExports = getOrCreateGauge('disclosure_packager_active_exports', {
            name: 'disclosure_packager_active_exports',
            help: 'Number of disclosure exports currently executing.',
            labelNames: ['tenant'],
        });
        this.warningCounter = getOrCreateCounter('disclosure_packager_warnings_total', {
            name: 'disclosure_packager_warnings_total',
            help: 'Warnings surfaced while assembling disclosure bundles.',
            labelNames: ['tenant', 'type'],
        });
    }
    static getInstance() {
        if (!DisclosureMetrics.instance) {
            DisclosureMetrics.instance = new DisclosureMetrics();
        }
        return DisclosureMetrics.instance;
    }
    recordEvent(event, tenant) {
        this.events.inc({ event, tenant });
    }
    exportStarted(tenant) {
        this.recordEvent('start', tenant);
        this.activeExports.inc({ tenant });
    }
    exportCompleted(tenant, durationMs, bundleBytes, warningTypes) {
        this.recordEvent('complete', tenant);
        this.activeExports.dec({ tenant });
        this.durations.observe({ tenant }, durationMs / 1000);
        this.bundleSize.observe({ tenant }, bundleBytes);
        const uniqueWarningTypes = Array.from(new Set(warningTypes));
        for (const type of uniqueWarningTypes) {
            this.warningCounter.inc({ tenant, type });
        }
    }
    exportFailed(tenant) {
        this.recordEvent('fail', tenant);
        this.activeExports.dec({ tenant });
    }
    uiEvent(event, tenant) {
        const metricEvent = event === 'view' ? 'ui_view' : 'ui_start';
        this.recordEvent(metricEvent, tenant);
    }
}
exports.DisclosureMetrics = DisclosureMetrics;
exports.disclosureMetrics = DisclosureMetrics.getInstance();
