/**
 * Chemical Weapons Tracking
 */

import {
  type ChemicalWeapon,
  type ChemicalFacility,
  type ChemicalAgentType,
  StorageCondition,
  type ConfidenceLevel,
  type WMDIncident
} from './types.js';

export class ChemicalWeaponsTracker {
  private weapons: Map<string, ChemicalWeapon>;
  private facilities: Map<string, ChemicalFacility>;
  private incidents: WMDIncident[];

  constructor() {
    this.weapons = new Map();
    this.facilities = new Map();
    this.incidents = [];
  }

  registerWeapon(weapon: ChemicalWeapon): void {
    this.weapons.set(weapon.id, weapon);
  }

  registerFacility(facility: ChemicalFacility): void {
    this.facilities.set(facility.id, facility);
  }

  recordIncident(incident: WMDIncident): void {
    this.incidents.push(incident);
  }

  getStockpileByCountry(country: string): ChemicalWeapon[] {
    return Array.from(this.weapons.values()).filter(w => w.country === country);
  }

  estimateTotalStockpile(country: string): number {
    return this.getStockpileByCountry(country)
      .reduce((sum, w) => sum + (w.quantity_estimate || 0), 0);
  }

  assessCWCCompliance(country: string): {
    compliant: boolean;
    declared_facilities: number;
    total_facilities: number;
    violations: string[];
  } {
    const facilities = Array.from(this.facilities.values())
      .filter(f => f.country === country);

    const declared = facilities.filter(f => f.cwc_declared).length;
    const violations: string[] = [];

    facilities.forEach(f => {
      if (!f.cwc_declared && f.facility_type === 'production') {
        violations.push(`Undeclared production facility: ${f.name}`);
      }
    });

    return {
      compliant: violations.length === 0,
      declared_facilities: declared,
      total_facilities: facilities.length,
      violations
    };
  }

  identifyPrecursorFlow(precursor: string): {
    sources: string[];
    destinations: string[];
    risk_assessment: 'high' | 'medium' | 'low';
  } {
    const facilities = Array.from(this.facilities.values())
      .filter(f => f.agents_produced.includes(precursor));

    return {
      sources: facilities.map(f => f.country),
      destinations: [],
      risk_assessment: facilities.length > 5 ? 'high' : 'medium'
    };
  }

  getDestructionProgress(country: string): {
    total_declared: number;
    destroyed: number;
    remaining: number;
    percentage_complete: number;
  } {
    const weapons = this.getStockpileByCountry(country);
    const destroyed = weapons.filter(w =>
      w.storage_condition === StorageCondition.DESTRUCTION_QUEUE
    ).length;

    return {
      total_declared: weapons.length,
      destroyed,
      remaining: weapons.length - destroyed,
      percentage_complete: (destroyed / weapons.length) * 100
    };
  }
}
