"use strict";
/**
 * Nuclear Infrastructure Monitoring
 *
 * Tracks overall nuclear infrastructure development and capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NuclearInfrastructureMonitor = void 0;
const types_js_1 = require("./types.js");
class NuclearInfrastructureMonitor {
    infrastructures;
    constructor() {
        this.infrastructures = new Map();
    }
    updateInfrastructure(country, infrastructure) {
        this.infrastructures.set(country, infrastructure);
    }
    getInfrastructure(country) {
        return this.infrastructures.get(country);
    }
    assessNuclearCapability(country) {
        const infra = this.getInfrastructure(country);
        if (!infra) {
            return {
                has_complete_fuel_cycle: false,
                enrichment_capable: false,
                reprocessing_capable: false,
                weapons_potential: 'none'
            };
        }
        const hasCycle = infra.fuel_cycle_stage.length >= 6;
        const hasEnrichment = infra.fuel_cycle_stage.includes(types_js_1.FuelCycleStage.ENRICHMENT);
        const hasReprocessing = infra.fuel_cycle_stage.includes(types_js_1.FuelCycleStage.REPROCESSING);
        let weapons_potential;
        if (hasEnrichment && hasReprocessing && infra.technology_level === types_js_1.TechnologyLevel.ADVANCED) {
            weapons_potential = 'high';
        }
        else if (hasEnrichment || hasReprocessing) {
            weapons_potential = 'medium';
        }
        else if (infra.indigenous_capability) {
            weapons_potential = 'low';
        }
        else {
            weapons_potential = 'none';
        }
        return {
            has_complete_fuel_cycle: hasCycle,
            enrichment_capable: hasEnrichment,
            reprocessing_capable: hasReprocessing,
            weapons_potential
        };
    }
    compareInfrastructures(country1, country2) {
        const infra1 = this.getInfrastructure(country1);
        const infra2 = this.getInfrastructure(country2);
        if (!infra1 || !infra2) {
            return { more_advanced: 'unknown', capability_gap: 0 };
        }
        const score1 = infra1.fuel_cycle_stage.length;
        const score2 = infra2.fuel_cycle_stage.length;
        return {
            more_advanced: score1 > score2 ? country1 : country2,
            capability_gap: Math.abs(score1 - score2)
        };
    }
}
exports.NuclearInfrastructureMonitor = NuclearInfrastructureMonitor;
