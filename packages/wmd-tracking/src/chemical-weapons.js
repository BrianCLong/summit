"use strict";
/**
 * Chemical Weapons Tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChemicalWeaponsTracker = void 0;
const types_js_1 = require("./types.js");
class ChemicalWeaponsTracker {
    weapons;
    facilities;
    incidents;
    constructor() {
        this.weapons = new Map();
        this.facilities = new Map();
        this.incidents = [];
    }
    registerWeapon(weapon) {
        this.weapons.set(weapon.id, weapon);
    }
    registerFacility(facility) {
        this.facilities.set(facility.id, facility);
    }
    recordIncident(incident) {
        this.incidents.push(incident);
    }
    getStockpileByCountry(country) {
        return Array.from(this.weapons.values()).filter(w => w.country === country);
    }
    estimateTotalStockpile(country) {
        return this.getStockpileByCountry(country)
            .reduce((sum, w) => sum + (w.quantity_estimate || 0), 0);
    }
    assessCWCCompliance(country) {
        const facilities = Array.from(this.facilities.values())
            .filter(f => f.country === country);
        const declared = facilities.filter(f => f.cwc_declared).length;
        const violations = [];
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
    identifyPrecursorFlow(precursor) {
        const facilities = Array.from(this.facilities.values())
            .filter(f => f.agents_produced.includes(precursor));
        return {
            sources: facilities.map(f => f.country),
            destinations: [],
            risk_assessment: facilities.length > 5 ? 'high' : 'medium'
        };
    }
    getDestructionProgress(country) {
        const weapons = this.getStockpileByCountry(country);
        const destroyed = weapons.filter(w => w.storage_condition === types_js_1.StorageCondition.DESTRUCTION_QUEUE).length;
        return {
            total_declared: weapons.length,
            destroyed,
            remaining: weapons.length - destroyed,
            percentage_complete: (destroyed / weapons.length) * 100
        };
    }
}
exports.ChemicalWeaponsTracker = ChemicalWeaponsTracker;
