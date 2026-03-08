"use strict";
/**
 * Missile System Tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissileTracker = void 0;
const types_js_1 = require("./types.js");
class MissileTracker {
    missiles;
    facilities;
    reentryVehicles;
    constructor() {
        this.missiles = new Map();
        this.facilities = new Map();
        this.reentryVehicles = new Map();
    }
    registerMissile(missile) {
        this.missiles.set(missile.id, missile);
        if (missile.missile_type === types_js_1.MissileType.BALLISTIC_ICBM) {
            console.warn(`ICBM system registered: ${missile.name} (${missile.country})`);
        }
        if (missile.range_km > 5500 && missile.mirv_capable) {
            console.warn(`MIRV-capable strategic missile: ${missile.name}`);
        }
    }
    registerFacility(facility) {
        this.facilities.set(facility.id, facility);
    }
    registerReentryVehicle(rv) {
        this.reentryVehicles.set(rv.missile_system_id, rv);
    }
    getMissilesByCountry(country) {
        return Array.from(this.missiles.values()).filter(m => m.country === country);
    }
    getStrategicMissiles(country) {
        return this.getMissilesByCountry(country)
            .filter(m => m.classification === 'strategic' || m.range_km > 5500);
    }
    getMissilesByType(type) {
        return Array.from(this.missiles.values()).filter(m => m.missile_type === type);
    }
    calculateStrikeRange(missileId, launchSiteId) {
        const missile = this.missiles.get(missileId);
        const facility = this.facilities.get(launchSiteId);
        if (!missile || !facility) {
            return { max_range_km: 0, targets_in_range: [] };
        }
        // In a real implementation, this would calculate actual geographic coverage
        return {
            max_range_km: missile.range_km,
            targets_in_range: []
        };
    }
    assessMIRVThreat(missileId) {
        const missile = this.missiles.get(missileId);
        const rv = this.reentryVehicles.get(missileId);
        if (!missile) {
            return { is_mirv: false, targets_per_launch: 0 };
        }
        return {
            is_mirv: missile.mirv_capable,
            warhead_count: rv?.number_of_rvs,
            targets_per_launch: rv?.number_of_rvs || 1
        };
    }
    getMobileLaunchers(country) {
        const missiles = this.getMissilesByCountry(country).filter(m => m.mobile);
        return {
            mobile_systems: missiles.reduce((sum, m) => sum + m.estimated_inventory, 0),
            system_names: missiles.map(m => m.name)
        };
    }
    assessHypersonicCapability(country) {
        const hypersonics = this.getMissilesByCountry(country)
            .filter(m => m.missile_type === types_js_1.MissileType.HYPERSONIC_GLIDE ||
            m.missile_type === types_js_1.MissileType.HYPERSONIC_CRUISE);
        const operational = hypersonics.filter(m => m.operational_status === types_js_1.OperationalStatus.OPERATIONAL ||
            m.operational_status === types_js_1.OperationalStatus.DEPLOYED);
        let threat_level;
        if (operational.length > 5) {
            threat_level = 'high';
        }
        else if (operational.length > 0) {
            threat_level = 'medium';
        }
        else if (hypersonics.length > 0) {
            threat_level = 'low';
        }
        else {
            threat_level = 'none';
        }
        return {
            has_capability: hypersonics.length > 0,
            systems: hypersonics.map(m => m.name),
            threat_level
        };
    }
}
exports.MissileTracker = MissileTracker;
