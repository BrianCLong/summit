"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UncertaintyMapper = void 0;
const TurbulentZone_js_1 = require("./models/TurbulentZone.js");
const FieldGenerator_js_1 = require("./algorithms/FieldGenerator.js");
const SurfaceInterpolator_js_1 = require("./algorithms/SurfaceInterpolator.js");
const ZoneIdentifier_js_1 = require("./algorithms/ZoneIdentifier.js");
const StabilizationRecommender_js_1 = require("./algorithms/StabilizationRecommender.js");
/**
 * Main orchestrator for uncertainty field mapping operations
 */
class UncertaintyMapper {
    fieldGenerator = null;
    surfaceInterpolator;
    zoneIdentifier;
    stabilizationRecommender;
    config;
    // In-memory storage (replace with database in production)
    fields = new Map();
    surfaces = new Map();
    zones = new Map();
    strategies = new Map();
    constructor(config = {}) {
        this.config = config;
        // Initialize components
        this.surfaceInterpolator = new SurfaceInterpolator_js_1.SurfaceInterpolator(config.surfaceInterpolator || {});
        this.zoneIdentifier = new ZoneIdentifier_js_1.ZoneIdentifier(config.zoneIdentifier || {});
        this.stabilizationRecommender = new StabilizationRecommender_js_1.StabilizationRecommender(config.stabilizationRecommender || {});
    }
    /**
     * Generate uncertainty field from predictions
     */
    async generateField(investigationId, predictions, dimensions, resolution) {
        // Create field generator with configuration
        this.fieldGenerator = new FieldGenerator_js_1.FieldGenerator({
            dimensions,
            resolution,
            interpolationMethod: this.config.fieldGenerator?.interpolationMethod,
        });
        // Generate field
        const field = await this.fieldGenerator.generate(investigationId, predictions);
        // Store field
        this.fields.set(field.id, field);
        // Automatically identify turbulent zones
        const zones = await this.identifyZones(field.id);
        // Generate stabilization strategies for each zone
        for (const zone of zones) {
            await this.generateStabilizationPlan(zone.id);
        }
        return field;
    }
    /**
     * Get uncertainty field by ID
     */
    async getField(fieldId) {
        return this.fields.get(fieldId);
    }
    /**
     * Get uncertainty field by investigation ID
     */
    async getFieldByInvestigation(investigationId) {
        for (const field of this.fields.values()) {
            if (field.investigationId === investigationId) {
                return field;
            }
        }
        return undefined;
    }
    /**
     * List all fields for an investigation
     */
    async listFields(investigationId) {
        const fields = [];
        for (const field of this.fields.values()) {
            if (field.investigationId === investigationId) {
                fields.push(field);
            }
        }
        return fields;
    }
    /**
     * Delete field
     */
    async deleteField(fieldId) {
        // Delete associated surfaces
        for (const [surfaceId, surface] of this.surfaces.entries()) {
            if (surface.fieldId === fieldId) {
                this.surfaces.delete(surfaceId);
            }
        }
        // Delete associated zones
        for (const [zoneId, zone] of this.zones.entries()) {
            if (zone.fieldId === fieldId) {
                // Delete associated strategies
                for (const [strategyId, strategy] of this.strategies.entries()) {
                    if (strategy.zoneId === zoneId) {
                        this.strategies.delete(strategyId);
                    }
                }
                this.zones.delete(zoneId);
            }
        }
        // Delete field
        return this.fields.delete(fieldId);
    }
    /**
     * Generate 2D surface representation
     */
    async generateSurface(fieldId, dimensions) {
        const field = this.fields.get(fieldId);
        if (!field) {
            throw new Error(`Field ${fieldId} not found`);
        }
        // Generate surface
        const surface = await this.surfaceInterpolator.interpolate(field, dimensions);
        // Store surface
        this.surfaces.set(surface.id, surface);
        return surface;
    }
    /**
     * Get surface by ID
     */
    async getSurface(surfaceId) {
        return this.surfaces.get(surfaceId);
    }
    /**
     * Identify turbulent zones in field
     */
    async identifyZones(fieldId, threshold) {
        const field = this.fields.get(fieldId);
        if (!field) {
            throw new Error(`Field ${fieldId} not found`);
        }
        // Create zone identifier with custom threshold if provided
        const identifier = threshold
            ? new ZoneIdentifier_js_1.ZoneIdentifier({
                threshold,
                minClusterSize: this.config.zoneIdentifier?.minClusterSize || 3,
            })
            : this.zoneIdentifier;
        // Identify zones
        const zones = await identifier.identify(field);
        // Store zones
        for (const zone of zones) {
            this.zones.set(zone.id, zone);
        }
        return zones;
    }
    /**
     * Get turbulent zones for a field
     */
    async getZones(fieldId) {
        const zones = [];
        for (const zone of this.zones.values()) {
            if (zone.fieldId === fieldId) {
                zones.push(zone);
            }
        }
        return zones;
    }
    /**
     * Get zone by ID
     */
    async getZone(zoneId) {
        return this.zones.get(zoneId);
    }
    /**
     * Manually mark a turbulent zone
     */
    async markZone(fieldId, bounds, markedBy, notes) {
        const field = this.fields.get(fieldId);
        if (!field) {
            throw new Error(`Field ${fieldId} not found`);
        }
        // Get points in zone
        const zonePoints = field.getPointsInBounds(bounds.dimensions);
        if (zonePoints.length === 0) {
            throw new Error('No points found in specified bounds');
        }
        // Calculate zone properties
        const intensity = Math.max(...zonePoints.map(p => p.uncertainty));
        // Calculate volume
        let volume = 1;
        for (const extent of Object.values(bounds.extent)) {
            volume *= extent;
        }
        // Create zone
        const zone = new TurbulentZone_js_1.TurbulentZone({
            fieldId,
            bounds,
            intensity,
            volume,
            persistence: 1.0, // Manually marked zones assumed persistent
            drivers: [], // Will be populated by analysis
            markedBy,
            markedAt: new Date(),
            notes,
        });
        // Store zone
        this.zones.set(zone.id, zone);
        // Generate stabilization plan
        await this.generateStabilizationPlan(zone.id);
        return zone;
    }
    /**
     * Generate stabilization plan for a zone
     */
    async generateStabilizationPlan(zoneId) {
        const zone = this.zones.get(zoneId);
        if (!zone) {
            throw new Error(`Zone ${zoneId} not found`);
        }
        const field = this.fields.get(zone.fieldId);
        if (!field) {
            throw new Error(`Field ${zone.fieldId} not found`);
        }
        // Generate recommendations
        const strategies = await this.stabilizationRecommender.recommend(zone, field);
        // Store strategies
        for (const strategy of strategies) {
            this.strategies.set(strategy.id, strategy);
        }
        return strategies;
    }
    /**
     * Get stabilization plan for a zone
     */
    async getStabilizationPlan(zoneId) {
        const strategies = [];
        for (const strategy of this.strategies.values()) {
            if (strategy.zoneId === zoneId) {
                strategies.push(strategy);
            }
        }
        return strategies.sort((a, b) => b.calculateScore() - a.calculateScore());
    }
    /**
     * Get strategy by ID
     */
    async getStrategy(strategyId) {
        return this.strategies.get(strategyId);
    }
    /**
     * Apply stabilization strategy
     */
    async applyStabilization(strategyId) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy) {
            throw new Error(`Strategy ${strategyId} not found`);
        }
        // In a real implementation, this would:
        // 1. Execute the strategy actions
        // 2. Collect new data or refine models
        // 3. Regenerate the uncertainty field
        // 4. Measure actual reduction
        // For now, return a simulated result
        const result = {
            success: true,
            strategyId,
            appliedAt: new Date(),
            actualReduction: strategy.expectedReduction * (0.8 + Math.random() * 0.4), // 80-120% of expected
            message: `Successfully applied ${strategy.type} strategy`,
        };
        return result;
    }
    /**
     * Get statistics for all fields
     */
    async getStatistics() {
        const totalFields = this.fields.size;
        const totalZones = this.zones.size;
        const totalStrategies = this.strategies.size;
        let totalUncertainty = 0;
        let pointCount = 0;
        for (const field of this.fields.values()) {
            totalUncertainty += field.metadata.averageUncertainty;
            pointCount++;
        }
        const averageUncertainty = pointCount > 0 ? totalUncertainty / pointCount : 0;
        const highSeverityZones = Array.from(this.zones.values()).filter(z => z.getSeverity() === 'high' || z.getSeverity() === 'critical').length;
        return {
            totalFields,
            totalZones,
            totalStrategies,
            averageUncertainty,
            highSeverityZones,
        };
    }
    /**
     * Clear all data (for testing)
     */
    async clear() {
        this.fields.clear();
        this.surfaces.clear();
        this.zones.clear();
        this.strategies.clear();
    }
}
exports.UncertaintyMapper = UncertaintyMapper;
