"use strict";
/**
 * Smart City Connector
 * Integration layer for city systems, IoT sensors, and cross-city federation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartCityConnector = exports.SmartCityConnector = void 0;
const uuid_1 = require("uuid");
const digitalTwin_js_1 = require("../types/digitalTwin.js");
const deprecation_js_1 = require("../utils/deprecation.js");
/**
 * Connector for smart city integrations
 * @deprecated Use generic IngestionService instead.
 */
class SmartCityConnector {
    endpoints = new Map();
    constructor() {
        (0, deprecation_js_1.warnDeprecation)({
            name: 'SmartCityConnector',
            replacement: 'IngestionService',
            removalTarget: 'Sprint N+57'
        });
    }
    federations = new Map();
    alerts = [];
    sensorCache = new Map();
    /**
     * Registers a city system endpoint
     * @param endpoint - Endpoint configuration
     */
    async registerEndpoint(endpoint) {
        const registered = {
            ...endpoint,
            id: (0, uuid_1.v4)(),
            status: 'ACTIVE',
        };
        this.endpoints.set(registered.id, registered);
        return registered;
    }
    /**
     * Gets all registered endpoints
     */
    async getEndpoints() {
        return Array.from(this.endpoints.values());
    }
    /**
     * Tests connectivity to an endpoint
     * @param endpointId - Endpoint ID to test
     */
    async testEndpoint(endpointId) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${endpointId}`);
        }
        const startTime = Date.now();
        try {
            // Simulated connectivity test
            await this.delay(Math.random() * 100 + 50);
            const latency = Date.now() - startTime;
            endpoint.status = 'ACTIVE';
            endpoint.lastSync = new Date();
            return { success: true, latency };
        }
        catch (error) {
            endpoint.status = 'ERROR';
            return { success: false, latency: -1 };
        }
    }
    /**
     * Ingests IoT sensor data
     * @param payload - Sensor data payload
     * @returns Processed sensor readings
     */
    async ingestIoTData(payload) {
        const readings = payload.readings.map((r) => ({
            sensorId: payload.deviceId,
            timestamp: new Date(payload.timestamp),
            value: r.value,
            unit: r.unit,
            quality: this.assessDataQuality(r.value, payload.timestamp),
        }));
        // Cache readings
        const existing = this.sensorCache.get(payload.deviceId) || [];
        this.sensorCache.set(payload.deviceId, [...existing.slice(-999), ...readings]);
        // Check for anomalies and generate alerts
        this.checkForAnomalies(payload.deviceId, readings);
        return readings;
    }
    /**
     * Bulk ingests sensor data from multiple devices
     * @param payloads - Array of sensor payloads
     */
    async bulkIngestIoTData(payloads) {
        let processed = 0;
        let errors = 0;
        for (const payload of payloads) {
            try {
                await this.ingestIoTData(payload);
                processed++;
            }
            catch {
                errors++;
            }
        }
        return { processed, errors };
    }
    /**
     * Generates real-time dashboard data
     * @param assets - Current asset collection
     */
    async getDashboardData(assets) {
        const assetsByType = {};
        const healthDistribution = {};
        for (const asset of assets) {
            assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;
            healthDistribution[asset.healthStatus] = (healthDistribution[asset.healthStatus] || 0) + 1;
        }
        const healthyCount = assets.filter((a) => a.healthScore >= 70).length;
        const onlineSensors = this.countOnlineSensors();
        return {
            timestamp: new Date(),
            summary: {
                totalAssets: assets.length,
                healthyAssets: healthyCount,
                alertCount: this.alerts.filter((a) => !a.acknowledged).length,
                activeSimulations: 0,
            },
            assetsByType,
            healthDistribution,
            recentAlerts: this.alerts.slice(-10),
            sensorStatus: {
                online: onlineSensors,
                offline: Math.floor(onlineSensors * 0.1),
                degraded: Math.floor(onlineSensors * 0.05),
            },
        };
    }
    /**
     * Creates a federation export configuration
     * @param config - Federation configuration
     */
    async createFederation(config) {
        const federation = {
            ...config,
            id: (0, uuid_1.v4)(),
            status: 'ACTIVE',
        };
        this.federations.set(federation.id, federation);
        return federation;
    }
    /**
     * Exports assets using Estonia model format
     * @param federationId - Federation ID
     * @param assets - Assets to export
     */
    async exportEstoniaModel(federationId, assets) {
        const federation = this.federations.get(federationId);
        if (!federation) {
            throw new Error(`Federation not found: ${federationId}`);
        }
        const startTime = Date.now();
        // Apply filter
        let filteredAssets = assets;
        if (federation.assetFilter.types?.length) {
            filteredAssets = filteredAssets.filter((a) => federation.assetFilter.types.includes(a.type));
        }
        if (federation.assetFilter.tags?.length) {
            filteredAssets = filteredAssets.filter((a) => federation.assetFilter.tags.some((t) => a.tags?.includes(t)));
        }
        // Transform to Estonia format
        const estoniaAssets = filteredAssets.map((asset) => ({
            uuid: asset.id,
            identifier: `${asset.type}-${asset.name.toLowerCase().replace(/\s+/g, '-')}`,
            classification: this.mapToEstoniaClassification(asset.type),
            geometry: asset.geometry,
            attributes: {
                name: asset.name,
                healthScore: asset.healthScore,
                healthStatus: asset.healthStatus,
                ...asset.metadata,
            },
            provenance: {
                source: 'IntelGraph Digital Twin',
                lastModified: asset.updatedAt.toISOString(),
                version: 1,
            },
        }));
        const exportDuration = Date.now() - startTime;
        federation.lastExport = new Date();
        return {
            version: '2.0',
            exportId: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            sourceCity: 'IntelGraph',
            targetCity: federation.targetCity,
            dataCategories: [...new Set(filteredAssets.map((a) => a.type))],
            assets: estoniaAssets,
            metadata: {
                totalRecords: estoniaAssets.length,
                exportDuration,
                checksums: {
                    sha256: this.generateChecksum(estoniaAssets),
                },
            },
        };
    }
    /**
     * Syncs data from a registered endpoint
     * @param endpointId - Endpoint to sync from
     */
    async syncFromEndpoint(endpointId) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${endpointId}`);
        }
        try {
            // Simulated sync
            await this.delay(500);
            const records = Math.floor(Math.random() * 100) + 10;
            endpoint.lastSync = new Date();
            endpoint.status = 'ACTIVE';
            return { records };
        }
        catch (error) {
            endpoint.status = 'ERROR';
            throw error;
        }
    }
    /**
     * Pushes data to a registered endpoint
     * @param endpointId - Endpoint to push to
     * @param assets - Assets to push
     */
    async pushToEndpoint(endpointId, assets) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${endpointId}`);
        }
        try {
            // Format data based on endpoint requirements
            const formattedData = this.formatForEndpoint(assets, endpoint);
            // Simulated push
            await this.delay(300);
            endpoint.lastSync = new Date();
            return { success: true, pushed: assets.length };
        }
        catch {
            endpoint.status = 'ERROR';
            return { success: false, pushed: 0 };
        }
    }
    /**
     * Creates an alert
     */
    async createAlert(assetId, type, message) {
        const alert = {
            id: (0, uuid_1.v4)(),
            assetId,
            type,
            message,
            timestamp: new Date(),
            acknowledged: false,
        };
        this.alerts.push(alert);
        return alert;
    }
    /**
     * Acknowledges an alert
     */
    async acknowledgeAlert(alertId) {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }
    /**
     * Gets active alerts
     */
    async getActiveAlerts() {
        return this.alerts.filter((a) => !a.acknowledged);
    }
    // Private helper methods
    assessDataQuality(value, timestamp) {
        const age = Date.now() - new Date(timestamp).getTime();
        if (age > 3600000)
            return 'LOW';
        if (value === null || value === undefined)
            return 'UNKNOWN';
        if (age > 300000)
            return 'MEDIUM';
        return 'HIGH';
    }
    checkForAnomalies(deviceId, readings) {
        const history = this.sensorCache.get(deviceId) || [];
        if (history.length < 10)
            return;
        for (const reading of readings) {
            if (typeof reading.value === 'number') {
                const historicalValues = history
                    .filter((h) => typeof h.value === 'number')
                    .map((h) => h.value);
                if (historicalValues.length > 0) {
                    const avg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
                    const stdDev = Math.sqrt(historicalValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
                        historicalValues.length);
                    if (Math.abs(reading.value - avg) > 3 * stdDev) {
                        this.createAlert(deviceId, 'WARNING', `Anomalous reading detected: ${reading.value} (expected: ${avg.toFixed(2)} ± ${stdDev.toFixed(2)})`);
                    }
                }
            }
        }
    }
    countOnlineSensors() {
        const recentThreshold = Date.now() - 300000; // 5 minutes
        let count = 0;
        for (const readings of this.sensorCache.values()) {
            const latest = readings[readings.length - 1];
            if (latest && latest.timestamp.getTime() > recentThreshold) {
                count++;
            }
        }
        return count;
    }
    mapToEstoniaClassification(type) {
        const mapping = {
            [digitalTwin_js_1.AssetType.BUILDING]: 'building',
            [digitalTwin_js_1.AssetType.BRIDGE]: 'transport:bridge',
            [digitalTwin_js_1.AssetType.ROAD]: 'transport:road',
            [digitalTwin_js_1.AssetType.UTILITY]: 'utility:general',
            [digitalTwin_js_1.AssetType.WATER_SYSTEM]: 'utility:water',
            [digitalTwin_js_1.AssetType.POWER_GRID]: 'utility:electricity',
            [digitalTwin_js_1.AssetType.TELECOMMUNICATIONS]: 'utility:telecom',
            [digitalTwin_js_1.AssetType.TRANSIT]: 'transport:public',
            [digitalTwin_js_1.AssetType.GREEN_SPACE]: 'environment:green',
            [digitalTwin_js_1.AssetType.WASTE_MANAGEMENT]: 'utility:waste',
        };
        return mapping[type] || 'other';
    }
    formatForEndpoint(assets, endpoint) {
        switch (endpoint.dataFormat) {
            case 'GEOJSON':
                return {
                    type: 'FeatureCollection',
                    features: assets.map((a) => ({
                        type: 'Feature',
                        id: a.id,
                        geometry: a.geometry,
                        properties: { name: a.name, type: a.type },
                    })),
                };
            case 'CSV':
                return assets.map((a) => `${a.id},${a.name},${a.type}`).join('\n');
            default:
                return { assets };
        }
    }
    generateChecksum(data) {
        // Simplified checksum for demo
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.SmartCityConnector = SmartCityConnector;
exports.smartCityConnector = new SmartCityConnector();
