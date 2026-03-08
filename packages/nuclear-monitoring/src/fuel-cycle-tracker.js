"use strict";
/**
 * Fuel Cycle Activity Tracking
 *
 * Tracks uranium mining, milling, conversion, and fuel fabrication activities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuelCycleTracker = void 0;
class FuelCycleTracker {
    activities;
    transports;
    constructor() {
        this.activities = new Map();
        this.transports = [];
    }
    recordActivity(activity) {
        const existing = this.activities.get(activity.facility_id) || [];
        existing.push(activity);
        this.activities.set(activity.facility_id, existing);
        if (activity.transport_activity) {
            this.transports.push(...activity.transport_activity);
        }
    }
    getActivities(facilityId) {
        return this.activities.get(facilityId) || [];
    }
    trackMaterialFlow(materialType) {
        return this.transports.filter(t => t.material_type === materialType);
    }
    estimateFuelCycleCapacity(country) {
        // This would aggregate across facilities
        return {
            mining_capacity: 0,
            conversion_capacity: 0,
            fabrication_capacity: 0,
            self_sufficient: false
        };
    }
}
exports.FuelCycleTracker = FuelCycleTracker;
