"use strict";
/**
 * Nuclear Facility Tracking System
 *
 * Tracks and monitors nuclear facilities worldwide including enrichment plants,
 * reactors, reprocessing facilities, and other nuclear infrastructure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NuclearFacilityTracker = void 0;
const types_js_1 = require("./types.js");
class NuclearFacilityTracker {
    facilities;
    alertThresholds;
    constructor() {
        this.facilities = new Map();
        this.alertThresholds = new Map();
        this.initializeAlertThresholds();
    }
    initializeAlertThresholds() {
        this.alertThresholds.set('undeclared_facility', 0.8);
        this.alertThresholds.set('safeguards_violation', 0.7);
        this.alertThresholds.set('construction_activity', 0.6);
    }
    /**
     * Register a new nuclear facility
     */
    registerFacility(facility) {
        this.facilities.set(facility.id, facility);
        // Check for alerts
        if (!facility.declared && facility.confidence_level !== types_js_1.ConfidenceLevel.LOW) {
            this.generateAlert(facility, 'undeclared_facility');
        }
        if (!facility.iaea_safeguards && this.isSafeguardsRequired(facility)) {
            this.generateAlert(facility, 'no_safeguards');
        }
    }
    /**
     * Update facility information
     */
    updateFacility(facilityId, updates) {
        const facility = this.facilities.get(facilityId);
        if (!facility) {
            throw new Error(`Facility ${facilityId} not found`);
        }
        const updated = {
            ...facility,
            ...updates,
            updated_at: new Date().toISOString()
        };
        this.facilities.set(facilityId, updated);
        // Check for status changes that require alerts
        if (updates.status === types_js_1.FacilityStatus.OPERATIONAL &&
            facility.status !== types_js_1.FacilityStatus.OPERATIONAL) {
            this.generateAlert(updated, 'facility_operational');
        }
    }
    /**
     * Get facility by ID
     */
    getFacility(facilityId) {
        return this.facilities.get(facilityId);
    }
    /**
     * Get all facilities by country
     */
    getFacilitiesByCountry(country) {
        return Array.from(this.facilities.values())
            .filter(f => f.country === country);
    }
    /**
     * Get facilities by type
     */
    getFacilitiesByType(type) {
        return Array.from(this.facilities.values())
            .filter(f => f.type === type);
    }
    /**
     * Search facilities by location radius
     */
    getFacilitiesNearLocation(location, radiusKm) {
        return Array.from(this.facilities.values())
            .filter(f => this.calculateDistance(location, f.location) <= radiusKm);
    }
    /**
     * Get undeclared facilities
     */
    getUndeclaredFacilities() {
        return Array.from(this.facilities.values())
            .filter(f => !f.declared);
    }
    /**
     * Get facilities without IAEA safeguards
     */
    getFacilitiesWithoutSafeguards() {
        return Array.from(this.facilities.values())
            .filter(f => !f.iaea_safeguards && this.isSafeguardsRequired(f));
    }
    /**
     * Get facilities by status
     */
    getFacilitiesByStatus(status) {
        return Array.from(this.facilities.values())
            .filter(f => f.status === status);
    }
    /**
     * Get construction activity (new facilities under construction)
     */
    getConstructionActivity() {
        return this.getFacilitiesByStatus(types_js_1.FacilityStatus.UNDER_CONSTRUCTION);
    }
    /**
     * Calculate distance between two geolocations (Haversine formula)
     */
    calculateDistance(loc1, loc2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(loc2.latitude - loc1.latitude);
        const dLon = this.toRad(loc2.longitude - loc1.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(loc1.latitude)) *
                Math.cos(this.toRad(loc2.latitude)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Check if IAEA safeguards are required for facility type
     */
    isSafeguardsRequired(facility) {
        const safeguardsTypes = [
            types_js_1.FacilityType.ENRICHMENT_PLANT,
            types_js_1.FacilityType.CENTRIFUGE_FACILITY,
            types_js_1.FacilityType.REPROCESSING_PLANT,
            types_js_1.FacilityType.POWER_REACTOR,
            types_js_1.FacilityType.RESEARCH_REACTOR,
            types_js_1.FacilityType.FUEL_FABRICATION
        ];
        return safeguardsTypes.includes(facility.type);
    }
    /**
     * Generate monitoring alert
     */
    generateAlert(facility, alertType) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            severity: this.determineAlertSeverity(alertType),
            alert_type: alertType,
            facility_id: facility.id,
            country: facility.country,
            description: this.getAlertDescription(facility, alertType),
            indicators: this.getAlertIndicators(facility, alertType),
            timestamp: new Date().toISOString(),
            requires_action: alertType === 'undeclared_facility' || alertType === 'safeguards_violation',
            recommended_actions: this.getRecommendedActions(alertType)
        };
        return alert;
    }
    determineAlertSeverity(alertType) {
        const severityMap = {
            'undeclared_facility': 'critical',
            'safeguards_violation': 'critical',
            'no_safeguards': 'high',
            'facility_operational': 'medium',
            'construction_activity': 'medium'
        };
        return severityMap[alertType] || 'low';
    }
    getAlertDescription(facility, alertType) {
        const descriptions = {
            'undeclared_facility': `Undeclared ${facility.type} facility detected in ${facility.country}`,
            'safeguards_violation': `IAEA safeguards violation at ${facility.name}`,
            'no_safeguards': `Facility ${facility.name} lacks required IAEA safeguards`,
            'facility_operational': `Facility ${facility.name} became operational`,
            'construction_activity': `Construction activity detected at ${facility.name}`
        };
        return descriptions[alertType] || 'Unknown alert';
    }
    getAlertIndicators(facility, alertType) {
        return [
            `Facility: ${facility.name}`,
            `Type: ${facility.type}`,
            `Location: ${facility.location.latitude}, ${facility.location.longitude}`,
            `Status: ${facility.status}`,
            `Confidence: ${facility.confidence_level}`
        ];
    }
    getRecommendedActions(alertType) {
        const actions = {
            'undeclared_facility': [
                'Conduct satellite imagery analysis',
                'Request IAEA inspection',
                'Diplomatic engagement',
                'Enhanced monitoring'
            ],
            'safeguards_violation': [
                'Immediate IAEA notification',
                'Request emergency inspection',
                'Escalate to UN Security Council',
                'Increase surveillance'
            ],
            'no_safeguards': [
                'Engage with country authorities',
                'Encourage Additional Protocol adoption',
                'Technical assistance offer'
            ]
        };
        return actions[alertType] || [];
    }
    /**
     * Get statistics by country
     */
    getCountryStatistics(country) {
        const facilities = this.getFacilitiesByCountry(country);
        const by_type = {};
        const by_status = {};
        facilities.forEach(f => {
            by_type[f.type] = (by_type[f.type] || 0) + 1;
            by_status[f.status] = (by_status[f.status] || 0) + 1;
        });
        return {
            total: facilities.length,
            by_type,
            by_status,
            safeguarded: facilities.filter(f => f.iaea_safeguards).length,
            declared: facilities.filter(f => f.declared).length
        };
    }
}
exports.NuclearFacilityTracker = NuclearFacilityTracker;
