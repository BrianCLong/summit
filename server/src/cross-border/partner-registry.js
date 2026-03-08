"use strict";
/**
 * Partner Nation Registry Service
 *
 * Manages trusted government assistant endpoints for cross-border
 * interoperability in the Bürokratt-style network.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerRegistry = void 0;
exports.getPartnerRegistry = getPartnerRegistry;
const events_1 = require("events");
/**
 * Default trust levels for partner nations
 */
const DEFAULT_TRUST_LEVELS = {
    1: {
        level: 1,
        maxDataClassification: 'public',
        allowedOperations: ['query'],
        requiresApproval: true,
        auditRequired: true,
    },
    2: {
        level: 2,
        maxDataClassification: 'internal',
        allowedOperations: ['query', 'verify'],
        requiresApproval: true,
        auditRequired: true,
    },
    3: {
        level: 3,
        maxDataClassification: 'confidential',
        allowedOperations: ['query', 'verify', 'submit'],
        requiresApproval: false,
        auditRequired: true,
    },
    4: {
        level: 4,
        maxDataClassification: 'restricted',
        allowedOperations: ['query', 'verify', 'submit', 'translate'],
        requiresApproval: false,
        auditRequired: true,
    },
    5: {
        level: 5,
        maxDataClassification: 'top_secret',
        allowedOperations: ['query', 'verify', 'submit', 'translate', 'admin'],
        requiresApproval: false,
        auditRequired: false,
    },
};
/**
 * Partner Nation Registry
 *
 * Maintains registry of trusted partner assistants and their capabilities.
 */
class PartnerRegistry extends events_1.EventEmitter {
    healthCheckIntervalMs;
    partners = new Map();
    healthStatus = new Map();
    healthCheckInterval = null;
    constructor(healthCheckIntervalMs = 30000) {
        super();
        this.healthCheckIntervalMs = healthCheckIntervalMs;
    }
    /**
     * Initialize the registry with default partners
     */
    async initialize() {
        // Register default EU partner nations (Bürokratt network)
        await this.registerDefaultPartners();
        this.startHealthChecks();
    }
    /**
     * Register default partner nations
     */
    async registerDefaultPartners() {
        const defaultPartners = [
            {
                code: 'EE',
                name: 'Estonia (Bürokratt)',
                region: 'EU',
                status: 'active',
                endpoint: {
                    baseUrl: 'https://api.burokratt.ee/v1',
                    wsUrl: 'wss://ws.burokratt.ee/v1',
                    protocol: 'mcp',
                    version: '1.0.0',
                    healthCheckPath: '/health',
                    authMethod: 'mtls',
                },
                capabilities: {
                    domains: ['tax', 'immigration', 'business', 'healthcare', 'education'],
                    operations: ['query', 'submit', 'verify', 'translate'],
                    maxContextSize: 32000,
                    supportsStreaming: true,
                    supportsMultimodal: false,
                    responseTimeMs: 2000,
                },
                languages: ['et', 'en', 'ru'],
                trustLevel: DEFAULT_TRUST_LEVELS[4],
                dataAgreements: [
                    {
                        id: 'eu-data-exchange-2024',
                        name: 'EU Digital Services Data Exchange',
                        type: 'multilateral',
                        scope: ['public', 'internal', 'confidential'],
                        domains: ['tax', 'immigration', 'business'],
                        restrictions: [],
                    },
                ],
            },
            {
                code: 'FI',
                name: 'Finland (AuroraAI)',
                region: 'EU',
                status: 'active',
                endpoint: {
                    baseUrl: 'https://api.auroraai.fi/v1',
                    protocol: 'rest',
                    version: '2.0.0',
                    healthCheckPath: '/status',
                    authMethod: 'oauth2',
                },
                capabilities: {
                    domains: ['tax', 'healthcare', 'social-services', 'education'],
                    operations: ['query', 'verify'],
                    maxContextSize: 16000,
                    supportsStreaming: false,
                    supportsMultimodal: false,
                    responseTimeMs: 3000,
                },
                languages: ['fi', 'sv', 'en'],
                trustLevel: DEFAULT_TRUST_LEVELS[4],
                dataAgreements: [
                    {
                        id: 'nordic-cooperation-2024',
                        name: 'Nordic Digital Cooperation Agreement',
                        type: 'multilateral',
                        scope: ['public', 'internal'],
                        domains: ['healthcare', 'social-services'],
                        restrictions: [],
                    },
                ],
            },
            {
                code: 'LV',
                name: 'Latvia (Latvija.lv)',
                region: 'EU',
                status: 'pending',
                endpoint: {
                    baseUrl: 'https://api.latvija.lv/assistant/v1',
                    protocol: 'rest',
                    version: '1.0.0',
                    healthCheckPath: '/health',
                    authMethod: 'jwt',
                },
                capabilities: {
                    domains: ['tax', 'business', 'immigration'],
                    operations: ['query'],
                    maxContextSize: 8000,
                    supportsStreaming: false,
                    supportsMultimodal: false,
                    responseTimeMs: 5000,
                },
                languages: ['lv', 'en', 'ru'],
                trustLevel: DEFAULT_TRUST_LEVELS[2],
                dataAgreements: [],
            },
            {
                code: 'LT',
                name: 'Lithuania (eGov)',
                region: 'EU',
                status: 'pending',
                endpoint: {
                    baseUrl: 'https://api.egov.lt/assistant/v1',
                    protocol: 'rest',
                    version: '1.0.0',
                    healthCheckPath: '/ping',
                    authMethod: 'jwt',
                },
                capabilities: {
                    domains: ['tax', 'business'],
                    operations: ['query'],
                    maxContextSize: 8000,
                    supportsStreaming: false,
                    supportsMultimodal: false,
                    responseTimeMs: 4000,
                },
                languages: ['lt', 'en'],
                trustLevel: DEFAULT_TRUST_LEVELS[2],
                dataAgreements: [],
            },
        ];
        for (const partner of defaultPartners) {
            await this.registerPartner(partner);
        }
    }
    /**
     * Register a new partner nation
     */
    async registerPartner(data) {
        const partner = {
            ...data,
            id: `partner_${data.code.toLowerCase()}_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.partners.set(partner.code, partner);
        this.emit('partnerRegistered', partner);
        return partner;
    }
    /**
     * Get a partner by country code
     */
    getPartner(code) {
        return this.partners.get(code.toUpperCase());
    }
    /**
     * Get all active partners
     */
    getActivePartners() {
        return Array.from(this.partners.values()).filter((p) => p.status === 'active');
    }
    /**
     * Get partners by capability domain
     */
    getPartnersByDomain(domain) {
        return Array.from(this.partners.values()).filter((p) => p.status === 'active' && p.capabilities.domains.includes(domain));
    }
    /**
     * Get partners by language support
     */
    getPartnersByLanguage(language) {
        return Array.from(this.partners.values()).filter((p) => p.status === 'active' && p.languages.includes(language));
    }
    /**
     * Check if a partner can handle data at a given classification
     */
    canHandleClassification(code, classification) {
        const partner = this.getPartner(code);
        if (!partner)
            return false;
        const classificationLevels = [
            'public',
            'internal',
            'confidential',
            'restricted',
            'top_secret',
        ];
        const partnerMaxLevel = classificationLevels.indexOf(partner.trustLevel.maxDataClassification);
        const requestedLevel = classificationLevels.indexOf(classification);
        return requestedLevel <= partnerMaxLevel;
    }
    /**
     * Find best partner for a request
     */
    findBestPartner(criteria) {
        let candidates = this.getPartnersByDomain(criteria.domain);
        if (criteria.language) {
            candidates = candidates.filter((p) => p.languages.includes(criteria.language));
        }
        if (criteria.classification) {
            candidates = candidates.filter((p) => this.canHandleClassification(p.code, criteria.classification));
        }
        if (criteria.preferredRegion) {
            const regionMatches = candidates.filter((p) => p.region === criteria.preferredRegion);
            if (regionMatches.length > 0) {
                candidates = regionMatches;
            }
        }
        // Sort by trust level (descending) and response time (ascending)
        candidates.sort((a, b) => {
            if (b.trustLevel.level !== a.trustLevel.level) {
                return b.trustLevel.level - a.trustLevel.level;
            }
            return a.capabilities.responseTimeMs - b.capabilities.responseTimeMs;
        });
        return candidates[0] || null;
    }
    /**
     * Update partner status
     */
    async updateStatus(code, status) {
        const partner = this.partners.get(code);
        if (partner) {
            partner.status = status;
            partner.updatedAt = new Date();
            this.emit('partnerStatusChanged', { code, status });
        }
    }
    /**
     * Get health status for a partner
     */
    getHealthStatus(code) {
        return this.healthStatus.get(code);
    }
    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        this.healthCheckInterval = setInterval(() => this.performHealthChecks(), this.healthCheckIntervalMs);
    }
    /**
     * Perform health checks on all partners
     */
    async performHealthChecks() {
        for (const partner of this.partners.values()) {
            try {
                const startTime = Date.now();
                const response = await fetch(`${partner.endpoint.baseUrl}${partner.endpoint.healthCheckPath}`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000),
                });
                const latencyMs = Date.now() - startTime;
                const currentHealth = this.healthStatus.get(partner.code);
                this.healthStatus.set(partner.code, {
                    partnerId: partner.id,
                    status: response.ok ? 'healthy' : 'degraded',
                    latencyMs,
                    lastChecked: new Date(),
                    errorRate: currentHealth?.errorRate ?? 0,
                    uptime: currentHealth?.uptime ?? 100,
                });
            }
            catch {
                const currentHealth = this.healthStatus.get(partner.code);
                this.healthStatus.set(partner.code, {
                    partnerId: partner.id,
                    status: 'unhealthy',
                    latencyMs: -1,
                    lastChecked: new Date(),
                    errorRate: (currentHealth?.errorRate ?? 0) + 1,
                    uptime: Math.max(0, (currentHealth?.uptime ?? 100) - 5),
                });
            }
        }
        this.emit('healthCheckComplete', Object.fromEntries(this.healthStatus));
    }
    /**
     * Stop the registry and cleanup
     */
    async shutdown() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.partners.clear();
        this.healthStatus.clear();
    }
}
exports.PartnerRegistry = PartnerRegistry;
// Singleton instance
let registryInstance = null;
function getPartnerRegistry() {
    if (!registryInstance) {
        registryInstance = new PartnerRegistry();
    }
    return registryInstance;
}
