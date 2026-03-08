"use strict";
/**
 * Organization Entity Specialization
 * Canonical organization entity type with business identity attributes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationEntityHelpers = void 0;
/**
 * Helper functions for Organization entities
 */
class OrganizationEntityHelpers {
    /**
     * Get the primary legal name
     */
    static getLegalName(org) {
        return org.names.find(n => n.type === 'legal');
    }
    /**
     * Get headquarters address
     */
    static getHeadquarters(org) {
        return org.addresses.find(a => a.type === 'headquarters');
    }
    /**
     * Get primary website
     */
    static getWebsite(org) {
        return org.contactInfo.find(c => c.type === 'website' && c.primary)?.value;
    }
    /**
     * Check if organization has a specific identifier type
     */
    static hasIdentifier(org, type) {
        return org.identifiers.some(id => id.type === type);
    }
    /**
     * Get identifier by type
     */
    static getIdentifier(org, type) {
        return org.identifiers.find(id => id.type === type);
    }
    /**
     * Check if organization is active (not dissolved)
     */
    static isActive(org) {
        return !org.details?.dateOfDissolution;
    }
    /**
     * Get age of organization in years
     */
    static getAge(org) {
        if (!org.details?.dateOfIncorporation) {
            return null;
        }
        const endDate = org.details.dateOfDissolution || new Date();
        const startDate = new Date(org.details.dateOfIncorporation);
        const ageMs = endDate.getTime() - startDate.getTime();
        return Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
    }
    /**
     * Normalize an organization name for ER matching
     */
    static normalizeName(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/gi, '') // Remove legal suffixes
            .replace(/[^\w\s]/g, '') // Remove special chars
            .trim();
    }
}
exports.OrganizationEntityHelpers = OrganizationEntityHelpers;
