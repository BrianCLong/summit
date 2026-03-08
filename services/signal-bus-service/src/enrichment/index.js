"use strict";
/**
 * Enrichment Pipeline
 *
 * Orchestrates multiple enrichers to enhance signal data.
 *
 * @module enrichment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentPipeline = exports.DeviceEnricherService = exports.createDeviceEnricher = exports.GeoIpEnricherService = exports.createGeoIpEnricher = void 0;
exports.createEnrichmentPipeline = createEnrichmentPipeline;
const device_enricher_js_1 = require("./device-enricher.js");
const geoip_enricher_js_1 = require("./geoip-enricher.js");
var geoip_enricher_js_2 = require("./geoip-enricher.js");
Object.defineProperty(exports, "createGeoIpEnricher", { enumerable: true, get: function () { return geoip_enricher_js_2.createGeoIpEnricher; } });
Object.defineProperty(exports, "GeoIpEnricherService", { enumerable: true, get: function () { return geoip_enricher_js_2.GeoIpEnricherService; } });
var device_enricher_js_2 = require("./device-enricher.js");
Object.defineProperty(exports, "createDeviceEnricher", { enumerable: true, get: function () { return device_enricher_js_2.createDeviceEnricher; } });
Object.defineProperty(exports, "DeviceEnricherService", { enumerable: true, get: function () { return device_enricher_js_2.DeviceEnricherService; } });
/**
 * Default configuration
 */
const defaultConfig = {
    geoIpEnabled: true,
    deviceLookupEnabled: true,
    timeoutMs: 5000,
    continueOnError: true,
};
/**
 * Enrichment Pipeline class
 */
class EnrichmentPipeline {
    config;
    logger;
    geoIpEnricher;
    deviceEnricher;
    stats = {
        total: 0,
        successful: 0,
        partial: 0,
        failed: 0,
    };
    constructor(logger, config, stateStore) {
        this.logger = logger.child({ component: 'enrichment-pipeline' });
        this.config = { ...defaultConfig, ...config };
        if (this.config.geoIpEnabled) {
            this.geoIpEnricher = (0, geoip_enricher_js_1.createGeoIpEnricher)(logger);
        }
        if (this.config.deviceLookupEnabled) {
            this.deviceEnricher = (0, device_enricher_js_1.createDeviceEnricher)(logger, undefined, stateStore);
        }
        this.logger.info({
            geoIpEnabled: this.config.geoIpEnabled,
            deviceLookupEnabled: this.config.deviceLookupEnabled,
        }, 'Enrichment pipeline initialized');
    }
    /**
     * Enrich a signal with all configured enrichers
     */
    async enrich(signal) {
        this.stats.total++;
        const startTime = Date.now();
        const errors = [];
        const enrichments = {};
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Enrichment timeout')), this.config.timeoutMs);
        });
        try {
            // Run enrichers in parallel
            const enrichmentPromises = [];
            // GeoIP enrichment
            if (this.geoIpEnricher && signal.metadata.source.sourceIp) {
                enrichmentPromises.push(this.runGeoIpEnrichment(signal, enrichments, errors));
            }
            // Device enrichment
            if (this.deviceEnricher && signal.device?.deviceId) {
                enrichmentPromises.push(this.runDeviceEnrichment(signal, enrichments, errors));
            }
            // Wait for all enrichments with timeout
            await Promise.race([
                Promise.all(enrichmentPromises),
                timeoutPromise,
            ]);
            const durationMs = Date.now() - startTime;
            // Determine success status
            if (errors.length === 0) {
                this.stats.successful++;
                return { success: true, enrichments, errors: [], durationMs };
            }
            else if (Object.keys(enrichments).length > 0) {
                this.stats.partial++;
                return { success: true, enrichments, errors, durationMs };
            }
            else {
                this.stats.failed++;
                return { success: false, enrichments, errors, durationMs };
            }
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            this.stats.failed++;
            if (error instanceof Error && error.message === 'Enrichment timeout') {
                errors.push({
                    enricherName: 'pipeline',
                    message: 'Enrichment timed out',
                    recoverable: true,
                });
            }
            else {
                errors.push({
                    enricherName: 'pipeline',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    recoverable: false,
                });
            }
            return {
                success: this.config.continueOnError,
                enrichments,
                errors,
                durationMs,
            };
        }
    }
    /**
     * Run GeoIP enrichment
     */
    async runGeoIpEnrichment(signal, enrichments, errors) {
        try {
            const ip = signal.metadata.source.sourceIp;
            if (!ip || !this.geoIpEnricher)
                return;
            const result = await this.geoIpEnricher.enrich(ip);
            if (result) {
                enrichments.geoIp = result;
            }
        }
        catch (error) {
            this.logger.warn({ error }, 'GeoIP enrichment failed');
            errors.push({
                enricherName: 'geoip',
                message: error instanceof Error ? error.message : 'Unknown error',
                recoverable: true,
            });
        }
    }
    /**
     * Run device enrichment
     */
    async runDeviceEnrichment(signal, enrichments, errors) {
        try {
            const deviceId = signal.device?.deviceId;
            if (!deviceId || !this.deviceEnricher)
                return;
            const result = await this.deviceEnricher.enrich(deviceId, {
                tenantId: signal.metadata.tenantId,
                location: signal.location
                    ? {
                        latitude: signal.location.latitude,
                        longitude: signal.location.longitude,
                    }
                    : undefined,
                deviceInfo: signal.device,
            });
            enrichments.deviceLookup = result;
        }
        catch (error) {
            this.logger.warn({ error }, 'Device enrichment failed');
            errors.push({
                enricherName: 'device',
                message: error instanceof Error ? error.message : 'Unknown error',
                recoverable: true,
            });
        }
    }
    /**
     * Apply enrichment result to signal
     */
    applyEnrichment(signal, result) {
        return {
            ...signal,
            enrichment: {
                ...signal.enrichment,
                geoIp: result.enrichments.geoIp ?? signal.enrichment?.geoIp,
                deviceLookup: result.enrichments.deviceLookup ?? signal.enrichment?.deviceLookup,
                custom: {
                    ...signal.enrichment?.custom,
                    ...result.enrichments.custom,
                },
            },
        };
    }
    /**
     * Get pipeline statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.total > 0
                ? (this.stats.successful + this.stats.partial) / this.stats.total
                : 1,
            geoIp: this.geoIpEnricher?.getStats(),
            device: this.deviceEnricher?.getStats(),
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = { total: 0, successful: 0, partial: 0, failed: 0 };
        this.geoIpEnricher?.resetStats();
        this.deviceEnricher?.resetStats();
    }
}
exports.EnrichmentPipeline = EnrichmentPipeline;
/**
 * Create an enrichment pipeline instance
 */
function createEnrichmentPipeline(logger, config, stateStore) {
    return new EnrichmentPipeline(logger, config, stateStore);
}
