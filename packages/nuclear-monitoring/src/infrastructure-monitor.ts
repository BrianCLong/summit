/**
 * Nuclear Infrastructure Monitoring
 *
 * Tracks overall nuclear infrastructure development and capabilities.
 */

import { type NuclearInfrastructure, FuelCycleStage, TechnologyLevel } from './types.js';

export class NuclearInfrastructureMonitor {
  private infrastructures: Map<string, NuclearInfrastructure>;

  constructor() {
    this.infrastructures = new Map();
  }

  updateInfrastructure(country: string, infrastructure: NuclearInfrastructure): void {
    this.infrastructures.set(country, infrastructure);
  }

  getInfrastructure(country: string): NuclearInfrastructure | undefined {
    return this.infrastructures.get(country);
  }

  assessNuclearCapability(country: string): {
    has_complete_fuel_cycle: boolean;
    enrichment_capable: boolean;
    reprocessing_capable: boolean;
    weapons_potential: 'high' | 'medium' | 'low' | 'none';
  } {
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
    const hasEnrichment = infra.fuel_cycle_stage.includes(FuelCycleStage.ENRICHMENT);
    const hasReprocessing = infra.fuel_cycle_stage.includes(FuelCycleStage.REPROCESSING);

    let weapons_potential: 'high' | 'medium' | 'low' | 'none';
    if (hasEnrichment && hasReprocessing && infra.technology_level === TechnologyLevel.ADVANCED) {
      weapons_potential = 'high';
    } else if (hasEnrichment || hasReprocessing) {
      weapons_potential = 'medium';
    } else if (infra.indigenous_capability) {
      weapons_potential = 'low';
    } else {
      weapons_potential = 'none';
    }

    return {
      has_complete_fuel_cycle: hasCycle,
      enrichment_capable: hasEnrichment,
      reprocessing_capable: hasReprocessing,
      weapons_potential
    };
  }

  compareInfrastructures(country1: string, country2: string): {
    more_advanced: string;
    capability_gap: number;
  } {
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
