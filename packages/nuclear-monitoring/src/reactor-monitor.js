"use strict";
/**
 * Nuclear Reactor Monitoring
 *
 * Tracks reactor operations, power output, and fuel cycles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactorMonitor = void 0;
class ReactorMonitor {
    reactors;
    constructor() {
        this.reactors = new Map();
    }
    registerReactor(reactor) {
        this.reactors.set(reactor.facility_id, reactor);
    }
    updateOperation(facilityId, updates) {
        const reactor = this.reactors.get(facilityId);
        if (!reactor)
            throw new Error(`Reactor ${facilityId} not found`);
        this.reactors.set(facilityId, { ...reactor, ...updates });
    }
    getReactor(facilityId) {
        return this.reactors.get(facilityId);
    }
    calculatePlutoniumProduction(facilityId) {
        const reactor = this.getReactor(facilityId);
        if (!reactor || !reactor.thermal_output)
            return 0;
        // Simplified: ~1 kg Pu per GWd (gigawatt-day) thermal
        const capacityFactor = reactor.capacity_factor || 0.85;
        const annualGWd = (reactor.thermal_output / 1000) * 365 * capacityFactor;
        return annualGWd; // kg Pu per year
    }
    assessProliferationRisk(facilityId) {
        const reactor = this.getReactor(facilityId);
        if (!reactor)
            return { risk_level: 'low', factors: ['No data'] };
        const factors = [];
        let riskScore = 0;
        // Heavy water or graphite reactors are easier for Pu production
        if (reactor.moderator_type === 'heavy_water' || reactor.moderator_type === 'graphite') {
            riskScore += 30;
            factors.push('Reactor type suitable for Pu production');
        }
        // Natural uranium fuel doesn't require enrichment capability
        if (reactor.fuel_type === 'natural_uranium') {
            riskScore += 20;
            factors.push('Uses natural uranium fuel');
        }
        // Low burnup means weapon-grade Pu possible
        if (reactor.burnup_rate && reactor.burnup_rate < 10) {
            riskScore += 25;
            factors.push('Low burnup rate (weapon-grade Pu possible)');
        }
        const risk_level = riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
        return { risk_level, factors };
    }
}
exports.ReactorMonitor = ReactorMonitor;
