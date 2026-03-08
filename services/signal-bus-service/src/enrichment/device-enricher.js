"use strict";
/**
 * Device Enricher
 *
 * Enriches signals with device profile information based on device IDs.
 * Tracks device history and calculates risk scores based on behavior patterns.
 *
 * @module device-enricher
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceEnricherService = void 0;
exports.createDeviceEnricher = createDeviceEnricher;
const lru_cache_1 = require("lru-cache");
/**
 * Default configuration
 */
const defaultConfig = {
    cacheSize: 10000,
    cacheTtlMs: 300000, // 5 minutes
    enableRiskScoring: true,
    riskWeights: {
        newDevice: 30,
        rapidLocationChange: 25,
        multipleEntities: 20,
        unusualActivity: 25,
    },
};
/**
 * In-memory device store for development/testing
 * In production, this would use Redis or similar
 */
class InMemoryDeviceStore {
    devices = new Map();
    async get(deviceId) {
        return this.devices.get(deviceId) ?? null;
    }
    async set(deviceId, profile) {
        this.devices.set(deviceId, profile);
    }
    async delete(deviceId) {
        this.devices.delete(deviceId);
    }
    async getByEntity(entityId) {
        return Array.from(this.devices.values()).filter((profile) => profile.associatedEntities.includes(entityId));
    }
}
/**
 * Device Enricher class
 */
class DeviceEnricherService {
    config;
    logger;
    cache;
    deviceStore;
    stateStore;
    stats = {
        lookups: 0,
        cacheHits: 0,
        cacheMisses: 0,
        newDevices: 0,
        errors: 0,
    };
    constructor(logger, config, stateStore) {
        this.logger = logger.child({ component: 'device-enricher' });
        this.config = { ...defaultConfig, ...config };
        this.stateStore = stateStore;
        this.deviceStore = new InMemoryDeviceStore();
        this.cache = new lru_cache_1.LRUCache({
            max: this.config.cacheSize,
            ttl: this.config.cacheTtlMs,
        });
        this.logger.info({ cacheSize: this.config.cacheSize, ttl: this.config.cacheTtlMs }, 'Device enricher initialized');
    }
    /**
     * Enrich with device profile information
     */
    async enrich(deviceId, context) {
        this.stats.lookups++;
        // Check cache first
        const cacheKey = `${context?.tenantId ?? 'default'}:${deviceId}`;
        const cached = this.cache.get(cacheKey);
        if (cached && !context?.location) {
            // Only use cache if no location update
            this.stats.cacheHits++;
            return cached;
        }
        this.stats.cacheMisses++;
        try {
            // Get or create device profile
            let profile = await this.deviceStore.get(deviceId);
            const isNewDevice = !profile;
            if (isNewDevice) {
                this.stats.newDevices++;
                profile = this.createNewProfile(deviceId, context);
            }
            else {
                profile = this.updateProfile(profile, context);
            }
            // Save updated profile
            await this.deviceStore.set(deviceId, profile);
            // Calculate enrichment result
            const result = this.calculateEnrichment(profile, isNewDevice);
            // Cache the result
            this.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            this.stats.errors++;
            this.logger.error({ error, deviceId }, 'Device enrichment failed');
            // Return minimal enrichment on error
            return {
                knownDevice: false,
                riskScore: 50, // Medium risk on error
            };
        }
    }
    /**
     * Batch enrich multiple devices
     */
    async enrichBatch(devices) {
        const results = new Map();
        // Process sequentially to avoid race conditions on same device
        for (const { deviceId, context } of devices) {
            const result = await this.enrich(deviceId, context);
            results.set(deviceId, result);
        }
        return results;
    }
    /**
     * Create a new device profile
     */
    createNewProfile(deviceId, context) {
        const now = Date.now();
        return {
            deviceId,
            firstSeen: now,
            lastSeen: now,
            signalCount: 1,
            associatedEntities: context?.entityId ? [context.entityId] : [],
            lastLocations: context?.location
                ? [
                    {
                        lat: context.location.latitude,
                        lng: context.location.longitude,
                        timestamp: now,
                    },
                ]
                : [],
            deviceType: context?.deviceInfo?.deviceType,
            manufacturer: context?.deviceInfo?.manufacturer,
            model: context?.deviceInfo?.model,
            osName: context?.deviceInfo?.osName,
            osVersion: context?.deviceInfo?.osVersion,
            tags: [],
            riskIndicators: ['new_device'],
        };
    }
    /**
     * Update an existing device profile
     */
    updateProfile(profile, context) {
        const now = Date.now();
        const updated = { ...profile };
        updated.lastSeen = now;
        updated.signalCount++;
        // Update associated entities
        if (context?.entityId && !updated.associatedEntities.includes(context.entityId)) {
            updated.associatedEntities = [...updated.associatedEntities, context.entityId];
            // Flag if too many entities
            if (updated.associatedEntities.length > 5) {
                if (!updated.riskIndicators.includes('multiple_entities')) {
                    updated.riskIndicators = [...updated.riskIndicators, 'multiple_entities'];
                }
            }
        }
        // Update location history
        if (context?.location) {
            const newLocation = {
                lat: context.location.latitude,
                lng: context.location.longitude,
                timestamp: now,
            };
            // Check for rapid location change
            if (updated.lastLocations.length > 0) {
                const lastLocation = updated.lastLocations[updated.lastLocations.length - 1];
                const distance = this.calculateDistance(lastLocation.lat, lastLocation.lng, newLocation.lat, newLocation.lng);
                const timeDiff = now - lastLocation.timestamp;
                // If moved more than 100km in less than 1 hour, flag as suspicious
                if (distance > 100 && timeDiff < 3600000) {
                    if (!updated.riskIndicators.includes('rapid_location_change')) {
                        updated.riskIndicators = [...updated.riskIndicators, 'rapid_location_change'];
                    }
                }
            }
            // Keep last 10 locations
            updated.lastLocations = [...updated.lastLocations.slice(-9), newLocation];
        }
        // Update device info if provided
        if (context?.deviceInfo) {
            updated.deviceType = context.deviceInfo.deviceType ?? updated.deviceType;
            updated.manufacturer = context.deviceInfo.manufacturer ?? updated.manufacturer;
            updated.model = context.deviceInfo.model ?? updated.model;
            updated.osName = context.deviceInfo.osName ?? updated.osName;
            updated.osVersion = context.deviceInfo.osVersion ?? updated.osVersion;
        }
        // Remove new_device indicator after 24 hours
        if (now - profile.firstSeen > 86400000) {
            updated.riskIndicators = updated.riskIndicators.filter((i) => i !== 'new_device');
        }
        return updated;
    }
    /**
     * Calculate enrichment result from profile
     */
    calculateEnrichment(profile, isNewDevice) {
        let riskScore = 0;
        if (this.config.enableRiskScoring) {
            // New device risk
            if (isNewDevice || profile.riskIndicators.includes('new_device')) {
                riskScore += this.config.riskWeights.newDevice;
            }
            // Rapid location change risk
            if (profile.riskIndicators.includes('rapid_location_change')) {
                riskScore += this.config.riskWeights.rapidLocationChange;
            }
            // Multiple entities risk
            if (profile.riskIndicators.includes('multiple_entities')) {
                riskScore += this.config.riskWeights.multipleEntities;
            }
            // Unusual activity risk
            if (profile.riskIndicators.includes('unusual_activity')) {
                riskScore += this.config.riskWeights.unusualActivity;
            }
            // Cap at 100
            riskScore = Math.min(riskScore, 100);
        }
        return {
            knownDevice: !isNewDevice,
            deviceProfile: profile.deviceType
                ? `${profile.manufacturer ?? 'Unknown'} ${profile.model ?? profile.deviceType}`
                : undefined,
            lastSeen: profile.lastSeen,
            associatedEntities: profile.associatedEntities,
            riskScore,
        };
    }
    /**
     * Calculate distance between two points in kilometers
     * Using Haversine formula
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
                Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Get devices associated with an entity
     */
    async getDevicesByEntity(entityId) {
        return this.deviceStore.getByEntity(entityId);
    }
    /**
     * Mark a device with a risk indicator
     */
    async addRiskIndicator(deviceId, indicator) {
        const profile = await this.deviceStore.get(deviceId);
        if (profile && !profile.riskIndicators.includes(indicator)) {
            profile.riskIndicators.push(indicator);
            await this.deviceStore.set(deviceId, profile);
            // Invalidate cache
            this.cache.delete(deviceId);
        }
    }
    /**
     * Get enricher statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.lookups > 0
                ? this.stats.cacheHits / this.stats.lookups
                : 0,
            cacheSize: this.cache.size,
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            lookups: 0,
            cacheHits: 0,
            cacheMisses: 0,
            newDevices: 0,
            errors: 0,
        };
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
        this.logger.info('Device cache cleared');
    }
}
exports.DeviceEnricherService = DeviceEnricherService;
/**
 * Create a device enricher instance
 */
function createDeviceEnricher(logger, config, stateStore) {
    return new DeviceEnricherService(logger, config, stateStore);
}
