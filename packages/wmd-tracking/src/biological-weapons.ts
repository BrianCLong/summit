/**
 * Biological Weapons and Pathogen Tracking
 */

import type {
  BiologicalThreat,
  BioLabFacility,
  PathogenType,
  WeaponizationLevel,
  ThreatLevel,
  SecurityLevel
} from './types.js';

export class BiologicalWeaponsTracker {
  private threats: Map<string, BiologicalThreat>;
  private facilities: Map<string, BioLabFacility>;

  constructor() {
    this.threats = new Map();
    this.facilities = new Map();
  }

  registerThreat(threat: BiologicalThreat): void {
    this.threats.set(threat.id, threat);

    if (threat.weaponization_level === WeaponizationLevel.WEAPONIZED) {
      console.warn(`CRITICAL: Weaponized biological agent detected - ${threat.pathogen_name}`);
    }
  }

  registerFacility(facility: BioLabFacility): void {
    this.facilities.set(facility.id, facility);

    if (facility.biosafety_level >= 4 && !facility.bwc_compliant) {
      console.warn(`BSL-4 facility not BWC compliant: ${facility.name}`);
    }
  }

  assessBioWeaponCapability(country: string): {
    capability_level: 'advanced' | 'intermediate' | 'basic' | 'none';
    bsl4_facilities: number;
    high_risk_pathogens: number;
    weaponization_capability: boolean;
    delivery_capability: boolean;
  } {
    const facilities = Array.from(this.facilities.values())
      .filter(f => f.country === country);

    const threats = Array.from(this.threats.values())
      .filter(t => t.country === country);

    const bsl4 = facilities.filter(f => f.biosafety_level === 4).length;
    const weaponized = threats.filter(t =>
      t.weaponization_level === WeaponizationLevel.WEAPONIZED
    ).length;

    let capability_level: 'advanced' | 'intermediate' | 'basic' | 'none';
    if (bsl4 > 2 && weaponized > 0) {
      capability_level = 'advanced';
    } else if (bsl4 > 0 || weaponized > 0) {
      capability_level = 'intermediate';
    } else if (facilities.length > 0) {
      capability_level = 'basic';
    } else {
      capability_level = 'none';
    }

    return {
      capability_level,
      bsl4_facilities: bsl4,
      high_risk_pathogens: weaponized,
      weaponization_capability: weaponized > 0,
      delivery_capability: threats.some(t => t.delivery_capability)
    };
  }

  identifyHighRiskPathogens(country: string): BiologicalThreat[] {
    return Array.from(this.threats.values())
      .filter(t => t.country === country &&
        (t.threat_level === ThreatLevel.CRITICAL ||
         t.threat_level === ThreatLevel.HIGH));
  }

  assessBiosafety(facilityId: string): {
    biosafety_adequate: boolean;
    security_level: SecurityLevel;
    concerns: string[];
  } {
    const facility = this.facilities.get(facilityId);
    if (!facility) {
      return { biosafety_adequate: false, security_level: SecurityLevel.INADEQUATE, concerns: [] };
    }

    const concerns: string[] = [];

    if (facility.biosafety_level >= 3 && facility.security_level === SecurityLevel.LOW) {
      concerns.push('Inadequate security for high-containment lab');
    }

    if (facility.dual_use_concern && !facility.bwc_compliant) {
      concerns.push('Dual-use facility without BWC compliance');
    }

    return {
      biosafety_adequate: concerns.length === 0,
      security_level: facility.security_level,
      concerns
    };
  }

  trackGeneticModification(pathogenName: string): BiologicalThreat[] {
    return Array.from(this.threats.values())
      .filter(t => t.pathogen_name === pathogenName && t.genetic_modification);
  }
}
