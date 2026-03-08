"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UncertaintyField = void 0;
const uuid_1 = require("uuid");
class UncertaintyField {
    id;
    investigationId;
    dimensions;
    points;
    resolution;
    generatedAt;
    metadata;
    constructor(data) {
        this.id = data.id || (0, uuid_1.v4)();
        this.investigationId = data.investigationId;
        this.dimensions = data.dimensions;
        this.points = data.points;
        this.resolution = data.resolution;
        this.generatedAt = data.generatedAt || new Date();
        this.metadata = data.metadata || this.calculateMetadata();
    }
    calculateMetadata() {
        const measuredPoints = this.points.filter(p => p.source === 'measured').length;
        const interpolatedPoints = this.points.filter(p => p.source === 'interpolated').length;
        const extrapolatedPoints = this.points.filter(p => p.source === 'extrapolated').length;
        const uncertainties = this.points.map(p => p.uncertainty);
        const averageUncertainty = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
        const maxUncertainty = Math.max(...uncertainties);
        const minUncertainty = Math.min(...uncertainties);
        return {
            totalPoints: this.points.length,
            measuredPoints,
            interpolatedPoints,
            extrapolatedPoints,
            averageUncertainty,
            maxUncertainty,
            minUncertainty,
            generationTimeMs: 0, // Set by generator
        };
    }
    /**
     * Get points within specified bounds
     */
    getPointsInBounds(bounds) {
        return this.points.filter(point => {
            return Object.entries(bounds).every(([dimension, [min, max]]) => {
                const value = point.coordinates[dimension];
                return value >= min && value <= max;
            });
        });
    }
    /**
     * Get dimension by name
     */
    getDimension(name) {
        return this.dimensions.find(d => d.name === name);
    }
    /**
     * Check if field has temporal dimension
     */
    hasTemporal() {
        return this.dimensions.some(d => d.type === 'temporal');
    }
    /**
     * Get temporal dimension if exists
     */
    getTemporalDimension() {
        return this.dimensions.find(d => d.type === 'temporal');
    }
    /**
     * Calculate uncertainty statistics for specific dimension values
     */
    getUncertaintyStats(dimension, value, tolerance = 0.01) {
        const relevantPoints = this.points.filter(p => {
            const coord = p.coordinates[dimension];
            return Math.abs(coord - value) <= tolerance;
        });
        if (relevantPoints.length === 0) {
            return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
        }
        const uncertainties = relevantPoints.map(p => p.uncertainty);
        const mean = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
        const variance = uncertainties.reduce((sum, u) => sum + Math.pow(u - mean, 2), 0) / uncertainties.length;
        const std = Math.sqrt(variance);
        return {
            mean,
            std,
            min: Math.min(...uncertainties),
            max: Math.max(...uncertainties),
            count: relevantPoints.length,
        };
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            investigationId: this.investigationId,
            dimensions: this.dimensions,
            points: this.points,
            resolution: this.resolution,
            generatedAt: this.generatedAt.toISOString(),
            metadata: this.metadata,
        };
    }
    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new UncertaintyField({
            ...json,
            generatedAt: new Date(json.generatedAt),
        });
    }
}
exports.UncertaintyField = UncertaintyField;
