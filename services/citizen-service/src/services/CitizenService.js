"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citizenService = exports.CitizenService = void 0;
const CitizenDataStore_js_1 = require("./CitizenDataStore.js");
/**
 * CitizenService - Business logic for citizen-centric service automation
 *
 * Core principles:
 * 1. Ingest data ONCE - no repeated paperwork
 * 2. Instant reuse across all government services
 * 3. Proactive service delivery based on eligibility
 * 4. Consent-based data sharing
 */
class CitizenService {
    store;
    constructor(store = CitizenDataStore_js_1.citizenStore) {
        this.store = store;
    }
    /**
     * Register a new citizen or update existing
     * This is the single point of data ingestion
     */
    async registerCitizen(data) {
        // Check if already exists
        const existing = await this.store.findByNationalId(data.nationalId);
        if (existing) {
            // Merge new data with existing
            return this.store.updateCitizen(existing.id, {
                ...data,
                verified: existing.verified,
                verificationDate: existing.verificationDate,
            });
        }
        return this.store.ingestCitizen({
            ...data,
            verified: false,
        });
    }
    /**
     * Request a government service
     * Automatically pulls citizen data - no repeated forms
     */
    async requestService(params) {
        const citizen = await this.store.getCitizen(params.citizenId);
        if (!citizen) {
            throw new Error('Citizen not found');
        }
        // Check consent for the service domain
        const hasConsent = await this.store.hasConsent(params.citizenId, params.domain);
        if (!hasConsent) {
            throw new Error(`Consent required for ${params.domain} services`);
        }
        return this.store.addServiceRecord({
            citizenId: params.citizenId,
            domain: params.domain,
            serviceType: params.serviceType,
            status: 'pending',
            requestDate: new Date().toISOString(),
            metadata: params.metadata,
            linkedRecords: [],
        });
    }
    /**
     * Grant consent for data sharing with a service domain
     */
    async grantConsent(params) {
        const consent = {
            citizenId: params.citizenId,
            domain: params.domain,
            consentGiven: true,
            consentDate: new Date().toISOString(),
            expiryDate: params.expiryDays
                ? new Date(Date.now() + params.expiryDays * 24 * 60 * 60 * 1000).toISOString()
                : undefined,
            scope: params.scope,
        };
        await this.store.recordConsent(consent);
        return consent;
    }
    /**
     * Compute and store service eligibility for proactive delivery
     */
    async computeEligibility(params) {
        const citizen = await this.store.getCitizen(params.citizenId);
        if (!citizen) {
            throw new Error('Citizen not found');
        }
        // Example eligibility rules (would be more complex in production)
        const eligible = this.evaluateEligibility(citizen, params.domain, params.serviceType);
        const eligibility = {
            citizenId: params.citizenId,
            domain: params.domain,
            serviceType: params.serviceType,
            eligible: eligible.isEligible,
            reason: eligible.reason,
            computedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        };
        await this.store.storeEligibility(eligibility);
        return eligibility;
    }
    /**
     * Get unified citizen view for service delivery
     */
    async getUnifiedView(citizenId) {
        return this.store.getUnifiedView(citizenId);
    }
    /**
     * Get proactive service recommendations
     */
    async getRecommendations(citizenId) {
        return this.store.getEligibleServices(citizenId);
    }
    /**
     * Transfer data between service domains (with consent check)
     */
    async transferData(params) {
        const hasFromConsent = await this.store.hasConsent(params.citizenId, params.fromDomain);
        const hasToConsent = await this.store.hasConsent(params.citizenId, params.toDomain);
        if (!hasFromConsent || !hasToConsent) {
            return {
                success: false,
                message: 'Consent required for both source and destination domains',
            };
        }
        // In production, this would actually transfer/link records
        return {
            success: true,
            message: `Data fields [${params.dataFields.join(', ')}] shared between ${params.fromDomain} and ${params.toDomain}`,
        };
    }
    /**
     * Evaluate eligibility based on citizen profile and service requirements
     */
    evaluateEligibility(citizen, domain, serviceType) {
        // Simplified eligibility rules - in production these would be policy-driven
        switch (domain) {
            case 'education':
                return { isEligible: true, reason: 'Basic education services available to all citizens' };
            case 'healthcare':
                return { isEligible: citizen.verified, reason: citizen.verified ? 'Verified citizen' : 'Verification required' };
            case 'social_services':
                return { isEligible: citizen.verified, reason: 'Means-tested services require verification' };
            default:
                return { isEligible: true };
        }
    }
}
exports.CitizenService = CitizenService;
// Default service instance
exports.citizenService = new CitizenService();
