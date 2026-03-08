"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceLedgerClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ProvenanceLedgerClient {
    client;
    constructor(baseURL, authorityId, reasonForAccess) {
        this.client = axios_1.default.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                ...(authorityId && { 'X-Authority-Id': authorityId }),
                ...(reasonForAccess && { 'X-Reason-For-Access': reasonForAccess }),
            },
        });
    }
    /**
     * Get claim by ID
     */
    async getClaim(id) {
        const response = await this.client.get(`/claims/${id}`);
        return response.data;
    }
    /**
     * Get evidence by ID
     */
    async getEvidence(id) {
        const response = await this.client.get(`/evidence/${id}`);
        return response.data;
    }
    /**
     * Get provenance chain for a claim
     */
    async getProvenanceChain(claimId) {
        const response = await this.client.get('/provenance', {
            params: { claimId },
        });
        return response.data;
    }
    /**
     * Get disclosure bundle for a case
     */
    async getDisclosureBundle(caseId) {
        const response = await this.client.get(`/bundles/${caseId}`);
        return response.data;
    }
    /**
     * Verify hash
     */
    async verifyHash(content, expectedHash) {
        const response = await this.client.post('/hash/verify', {
            content,
            expectedHash,
        });
        return response.data;
    }
    /**
     * Export manifest
     */
    async exportManifest() {
        const response = await this.client.get('/export/manifest');
        return response.data;
    }
    /**
     * Health check
     */
    async healthCheck() {
        const response = await this.client.get('/health');
        return response.data;
    }
}
exports.ProvenanceLedgerClient = ProvenanceLedgerClient;
