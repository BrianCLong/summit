"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiRegionProber = void 0;
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const metrics_js_1 = require("../../monitoring/metrics.js");
class MultiRegionProber {
    regions;
    client;
    constructor(regions, client) {
        this.regions = regions;
        this.client = client || axios_1.default.create();
    }
    /**
     * Probes all configured regions and returns their health status.
     */
    async probeAll() {
        const promises = this.regions.map((region) => this.probeRegion(region));
        return Promise.all(promises);
    }
    /**
     * Probes a single region.
     */
    async probeRegion(region) {
        const start = Date.now();
        try {
            await this.client.get(region.endpoint, {
                timeout: region.timeoutMs || 5000,
                validateStatus: (status) => status >= 200 && status < 300,
            });
            const duration = Date.now() - start;
            // Update Prometheus metrics
            metrics_js_1.regionProbeLatencyMs.set({ region_id: region.id, region_name: region.name }, duration);
            metrics_js_1.regionHealthStatus.set({ region_id: region.id, region_name: region.name }, 1);
            return {
                regionId: region.id,
                regionName: region.name,
                isHealthy: true,
                latencyMs: duration,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const duration = Date.now() - start;
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Update Prometheus metrics
            metrics_js_1.regionProbeLatencyMs.set({ region_id: region.id, region_name: region.name }, duration);
            metrics_js_1.regionHealthStatus.set({ region_id: region.id, region_name: region.name }, 0);
            return {
                regionId: region.id,
                regionName: region.name,
                isHealthy: false,
                latencyMs: duration,
                lastChecked: new Date(),
                error: errorMessage || 'Unknown error',
            };
        }
    }
    getRegions() {
        return this.regions;
    }
}
exports.MultiRegionProber = MultiRegionProber;
