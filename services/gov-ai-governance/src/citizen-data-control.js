"use strict";
/**
 * Citizen Data Control Service
 *
 * Provides citizens with full transparency and control over their data.
 * Implements GDPR-style rights for government AI systems.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitizenDataControl = void 0;
const uuid_1 = require("uuid");
class CitizenDataControl {
    consents;
    requests;
    auditService;
    constructor(config = {}) {
        this.consents = config.consentStore ?? new Map();
        this.requests = config.requestStore ?? new Map();
        this.auditService = config.auditService;
    }
    /**
     * Record citizen consent for data processing
     */
    async grantConsent(consent) {
        const fullConsent = {
            ...consent,
            consentTimestamp: new Date().toISOString(),
        };
        const existing = this.consents.get(consent.citizenId) ?? [];
        existing.push(fullConsent);
        this.consents.set(consent.citizenId, existing);
        await this.audit('consent_granted', consent.citizenId, { consent: fullConsent });
        return fullConsent;
    }
    /**
     * Withdraw previously granted consent
     */
    async withdrawConsent(citizenId, dataCategories, purposes) {
        const existing = this.consents.get(citizenId);
        if (!existing) {
            return false;
        }
        const updated = existing.filter((c) => !dataCategories.some((dc) => c.dataCategories.includes(dc)) ||
            !purposes.some((p) => c.purposes.includes(p)));
        this.consents.set(citizenId, updated);
        await this.audit('consent_withdrawn', citizenId, { dataCategories, purposes });
        return true;
    }
    /**
     * Get all active consents for a citizen
     */
    async getConsents(citizenId) {
        const consents = this.consents.get(citizenId) ?? [];
        const now = new Date();
        return consents.filter((c) => {
            if (!c.expiresAt) {
                return c.consentGiven;
            }
            return c.consentGiven && new Date(c.expiresAt) > now;
        });
    }
    /**
     * Check if processing is allowed for given categories and purpose
     */
    async checkConsent(citizenId, dataCategory, purpose) {
        const consents = await this.getConsents(citizenId);
        const matching = consents.find((c) => c.dataCategories.includes(dataCategory) &&
            c.purposes.includes(purpose) &&
            c.consentGiven);
        return {
            allowed: Boolean(matching),
            basis: matching ? 'explicit_consent' : 'no_consent',
        };
    }
    /**
     * Submit a data access request (DSAR)
     */
    async submitAccessRequest(request) {
        const fullRequest = {
            ...request,
            requestId: (0, uuid_1.v4)(),
            submittedAt: new Date().toISOString(),
            status: 'pending',
        };
        this.requests.set(fullRequest.requestId, fullRequest);
        await this.audit('data_access_request_submitted', request.citizenId, { request: fullRequest });
        return fullRequest;
    }
    /**
     * Get status of a data access request
     */
    async getRequestStatus(requestId) {
        return this.requests.get(requestId) ?? null;
    }
    /**
     * Process and complete a data access request
     */
    async completeRequest(requestId, status) {
        const request = this.requests.get(requestId);
        if (!request) {
            return null;
        }
        const updated = {
            ...request,
            status,
            completedAt: new Date().toISOString(),
        };
        this.requests.set(requestId, updated);
        await this.audit('data_access_request_completed', request.citizenId, { request: updated });
        return updated;
    }
    /**
     * Get all requests for a citizen
     */
    async getCitizenRequests(citizenId) {
        return Array.from(this.requests.values()).filter((r) => r.citizenId === citizenId);
    }
    /**
     * Export all citizen data (portability)
     */
    async exportCitizenData(citizenId) {
        const data = {
            consents: await this.getConsents(citizenId),
            requests: await this.getCitizenRequests(citizenId),
            exportedAt: new Date().toISOString(),
        };
        await this.audit('data_exported', citizenId, { summary: `Exported ${data.consents.length} consents, ${data.requests.length} requests` });
        return data;
    }
    async audit(eventType, citizenId, details) {
        if (this.auditService) {
            await this.auditService.log({
                eventType,
                actorId: citizenId,
                actorType: 'citizen',
                timestamp: new Date().toISOString(),
                details,
            });
        }
    }
}
exports.CitizenDataControl = CitizenDataControl;
