"use strict";
/**
 * Prov-Ledger Service Client
 * HTTP client for communicating with the Provenance & Claims Ledger service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvLedgerClient = void 0;
exports.createProvLedgerClient = createProvLedgerClient;
const axios_1 = __importDefault(require("axios"));
class ProvLedgerClient {
    client;
    config;
    constructor(config) {
        this.config = {
            timeout: 5000,
            retries: 3,
            ...config,
        };
        this.client = axios_1.default.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'x-authority-id': this.config.authorityId,
                'x-reason-for-access': this.config.reasonForAccess,
            },
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, this.handleError.bind(this));
    }
    async handleError(error) {
        const status = error.response?.status;
        const data = error.response?.data;
        const provError = new Error(data?.error || error.message);
        provError.name = 'ProvLedgerError';
        provError.statusCode = status;
        provError.code = data?.code;
        throw provError;
    }
    // ============================================================================
    // Claims API
    // ============================================================================
    /**
     * Register a new claim
     */
    async createClaim(request) {
        const response = await this.client.post('/claims', request);
        return response.data;
    }
    /**
     * Get a claim by ID
     */
    async getClaim(id) {
        const response = await this.client.get(`/claims/${id}`);
        return response.data;
    }
    // ============================================================================
    // Evidence API
    // ============================================================================
    /**
     * Register new evidence with checksum and transform chain
     */
    async createEvidence(request) {
        const response = await this.client.post('/evidence', request);
        return response.data;
    }
    /**
     * Get evidence by ID
     */
    async getEvidence(id) {
        const response = await this.client.get(`/evidence/${id}`);
        return response.data;
    }
    // ============================================================================
    // Provenance API
    // ============================================================================
    /**
     * Create a provenance chain for a claim
     */
    async createProvenanceChain(request) {
        const response = await this.client.post('/provenance', request);
        return response.data;
    }
    /**
     * Get provenance chains for a claim
     */
    async getProvenanceChains(claimId) {
        const response = await this.client.get('/provenance', {
            params: { claimId },
        });
        return response.data;
    }
    // ============================================================================
    // Bundle API
    // ============================================================================
    /**
     * Get disclosure bundle manifest for a case
     * Returns hash tree and transform chain for all evidence in the case
     */
    async getDisclosureBundle(caseId) {
        const response = await this.client.get(`/bundles/${caseId}`);
        return response.data;
    }
    // ============================================================================
    // Verification API
    // ============================================================================
    /**
     * Verify content hash
     */
    async verifyHash(request) {
        const response = await this.client.post('/hash/verify', request);
        return response.data;
    }
    /**
     * Get export manifest with all claims
     */
    async getExportManifest() {
        const response = await this.client.get('/export/manifest');
        return response.data;
    }
    // ============================================================================
    // Health Check
    // ============================================================================
    /**
     * Check service health
     */
    async healthCheck() {
        const response = await this.client.get('/health');
        return response.data;
    }
}
exports.ProvLedgerClient = ProvLedgerClient;
/**
 * Factory function to create a ProvLedgerClient instance
 */
function createProvLedgerClient(config) {
    return new ProvLedgerClient(config);
}
