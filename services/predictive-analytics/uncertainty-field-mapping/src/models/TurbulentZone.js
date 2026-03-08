"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurbulentZone = void 0;
const uuid_1 = require("uuid");
class TurbulentZone {
    id;
    fieldId;
    bounds;
    intensity;
    volume;
    persistence;
    drivers;
    markedBy;
    markedAt;
    notes;
    constructor(data) {
        this.id = data.id || (0, uuid_1.v4)();
        this.fieldId = data.fieldId;
        this.bounds = data.bounds;
        this.intensity = data.intensity;
        this.volume = data.volume;
        this.persistence = data.persistence;
        this.drivers = data.drivers;
        this.markedBy = data.markedBy;
        this.markedAt = data.markedAt;
        this.notes = data.notes;
    }
    /**
     * Check if point is within zone bounds
     */
    containsPoint(coordinates) {
        return Object.entries(this.bounds.dimensions).every(([dimension, [min, max]]) => {
            const value = coordinates[dimension];
            return value !== undefined && value >= min && value <= max;
        });
    }
    /**
     * Calculate distance from point to zone center
     */
    distanceFromCenter(coordinates) {
        let sumSquares = 0;
        for (const [dimension, centerValue] of Object.entries(this.bounds.center)) {
            const pointValue = coordinates[dimension];
            if (pointValue !== undefined) {
                sumSquares += Math.pow(pointValue - centerValue, 2);
            }
        }
        return Math.sqrt(sumSquares);
    }
    /**
     * Get primary (highest contribution) driver
     */
    getPrimaryDriver() {
        return this.drivers.reduce((max, driver) => driver.contribution > (max?.contribution || 0) ? driver : max, undefined);
    }
    /**
     * Get drivers by trend
     */
    getDriversByTrend(trend) {
        return this.drivers.filter(d => d.trend === trend);
    }
    /**
     * Calculate total contribution of all drivers
     */
    getTotalContribution() {
        return this.drivers.reduce((sum, d) => sum + d.contribution, 0);
    }
    /**
     * Get severity level based on intensity and volume
     */
    getSeverity() {
        const score = this.intensity * Math.log(this.volume + 1);
        if (score > 5)
            return 'critical';
        if (score > 3)
            return 'high';
        if (score > 1)
            return 'medium';
        return 'low';
    }
    /**
     * Check if zone is expanding
     */
    isExpanding() {
        const increasingDrivers = this.getDriversByTrend('increasing');
        const totalIncrease = increasingDrivers.reduce((sum, d) => sum + d.contribution, 0);
        return totalIncrease > 0.5; // More than 50% contribution from increasing drivers
    }
    /**
     * Check if zone is stable
     */
    isStable() {
        return this.persistence > 0.8; // High persistence indicates stability
    }
    /**
     * Merge with another zone
     */
    mergeWith(other) {
        // Calculate merged bounds
        const mergedBounds = {
            dimensions: {},
            center: {},
            extent: {},
        };
        for (const dimension of Object.keys(this.bounds.dimensions)) {
            const [min1, max1] = this.bounds.dimensions[dimension];
            const [min2, max2] = other.bounds.dimensions[dimension] || [min1, max1];
            const newMin = Math.min(min1, min2);
            const newMax = Math.max(max1, max2);
            mergedBounds.dimensions[dimension] = [newMin, newMax];
            mergedBounds.center[dimension] = (newMin + newMax) / 2;
            mergedBounds.extent[dimension] = newMax - newMin;
        }
        // Merge drivers
        const driverMap = new Map();
        for (const driver of [...this.drivers, ...other.drivers]) {
            const existing = driverMap.get(driver.factor);
            if (existing) {
                existing.contribution = Math.max(existing.contribution, driver.contribution);
            }
            else {
                driverMap.set(driver.factor, { ...driver });
            }
        }
        return new TurbulentZone({
            fieldId: this.fieldId,
            bounds: mergedBounds,
            intensity: Math.max(this.intensity, other.intensity),
            volume: this.volume + other.volume,
            persistence: (this.persistence + other.persistence) / 2,
            drivers: Array.from(driverMap.values()),
        });
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            fieldId: this.fieldId,
            bounds: this.bounds,
            intensity: this.intensity,
            volume: this.volume,
            persistence: this.persistence,
            drivers: this.drivers,
            markedBy: this.markedBy,
            markedAt: this.markedAt?.toISOString(),
            notes: this.notes,
        };
    }
    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new TurbulentZone({
            ...json,
            markedAt: json.markedAt ? new Date(json.markedAt) : undefined,
        });
    }
}
exports.TurbulentZone = TurbulentZone;
