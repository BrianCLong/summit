"use strict";
/**
 * Biological Weapons and Pathogen Tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiologicalWeaponsTracker = void 0;
const types_js_1 = require("./types.js");
class BiologicalWeaponsTracker {
    threats;
    facilities;
    constructor() {
        this.threats = new Map();
        this.facilities = new Map();
    }
    registerThreat(threat) {
        this.threats.set(threat.id, threat);
        if (threat.weaponization_level === types_js_1.WeaponizationLevel.WEAPONIZED) {
            console.warn(`CRITICAL: Weaponized biological agent detected - ${threat.pathogen_name}`);
        }
    }
    registerFacility(facility) {
        this.facilities.set(facility.id, facility);
        if (facility.biosafety_level >= 4 && !facility.bwc_compliant) {
            console.warn(`BSL-4 facility not BWC compliant: ${facility.name}`);
        }
    }
    assessBioWeaponCapability(country) {
        const facilities = Array.from(this.facilities.values())
            .filter(f => f.country === country);
        const threats = Array.from(this.threats.values())
            .filter(t => t.country === country);
        const bsl4 = facilities.filter(f => f.biosafety_level === 4).length;
        const weaponized = threats.filter(t => t.weaponization_level === types_js_1.WeaponizationLevel.WEAPONIZED).length;
        let capability_level;
        if (bsl4 > 2 && weaponized > 0) {
            capability_level = 'advanced';
        }
        else if (bsl4 > 0 || weaponized > 0) {
            capability_level = 'intermediate';
        }
        else if (facilities.length > 0) {
            capability_level = 'basic';
        }
        else {
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
    identifyHighRiskPathogens(country) {
        return Array.from(this.threats.values())
            .filter(t => t.country === country &&
            (t.threat_level === types_js_1.ThreatLevel.CRITICAL ||
                t.threat_level === types_js_1.ThreatLevel.HIGH));
    }
    assessBiosafety(facilityId) {
        const facility = this.facilities.get(facilityId);
        if (!facility) {
            return { biosafety_adequate: false, security_level: types_js_1.SecurityLevel.INADEQUATE, concerns: [] };
        }
        const concerns = [];
        if (facility.biosafety_level >= 3 && facility.security_level === types_js_1.SecurityLevel.LOW) {
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
    trackGeneticModification(pathogenName) {
        return Array.from(this.threats.values())
            .filter(t => t.pathogen_name === pathogenName && t.genetic_modification);
    }
}
exports.BiologicalWeaponsTracker = BiologicalWeaponsTracker;
