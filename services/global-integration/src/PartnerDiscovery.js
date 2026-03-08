"use strict";
/**
 * Partner Discovery Service
 *
 * Autonomous discovery of global partners through multiple channels:
 * - X-Road catalog (Estonia/Nordic/Baltic)
 * - EU Open Data Portal
 * - Government API registries
 * - Academic institution APIs
 * - Business partner directories
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerDiscoveryService = void 0;
class PartnerDiscoveryService {
    sources = new Map();
    discoveredCache = new Map();
    apiSpecCache = new Map();
    constructor() {
        this.initializeDefaultSources();
    }
    /**
     * Initialize default discovery sources
     */
    initializeDefaultSources() {
        // Estonian X-Road
        this.registerSource({
            id: 'x-road-ee',
            name: 'Estonian X-Road',
            type: 'x-road',
            region: 'Baltic',
            endpoint: 'https://x-road.ee/catalog',
            authRequired: true,
            rateLimit: 100,
        });
        // Finnish X-Road (Suomi.fi)
        this.registerSource({
            id: 'x-road-fi',
            name: 'Finnish X-Road',
            type: 'x-road',
            region: 'Nordic',
            endpoint: 'https://palvelutietovaranto.suomi.fi',
            authRequired: true,
            rateLimit: 100,
        });
        // EU Open Data Portal
        this.registerSource({
            id: 'eu-open-data',
            name: 'EU Open Data Portal',
            type: 'open-data',
            region: 'EU',
            endpoint: 'https://data.europa.eu/api/hub/search',
            authRequired: false,
            rateLimit: 50,
        });
        // Nordic API Gateway
        this.registerSource({
            id: 'nordic-api',
            name: 'Nordic API Gateway',
            type: 'registry',
            region: 'Nordic',
            endpoint: 'https://api.nordic-gateway.org',
            authRequired: true,
            rateLimit: 60,
        });
    }
    /**
     * Register a new discovery source
     */
    registerSource(source) {
        this.sources.set(source.id, source);
        console.log(`[PartnerDiscovery] Registered source: ${source.name}`);
    }
    /**
     * Discover partners across all sources
     */
    async discoverAll(filter) {
        const allPartners = [];
        const allApiSpecs = [];
        const complianceGaps = [];
        const recommendations = [];
        for (const [sourceId, source] of this.sources) {
            // Apply region filter
            if (filter?.regions && !filter.regions.includes(source.region)) {
                continue;
            }
            try {
                const result = await this.discoverFromSource(source, filter);
                allPartners.push(...result.partners);
                allApiSpecs.push(...result.apiSpecs);
            }
            catch (error) {
                console.error(`[PartnerDiscovery] Failed to discover from ${source.name}:`, error);
            }
        }
        // Deduplicate partners
        const uniquePartners = this.deduplicatePartners(allPartners);
        // Analyze for compliance gaps
        for (const partner of uniquePartners) {
            const gaps = await this.analyzeComplianceGaps(partner, filter?.complianceFrameworks);
            complianceGaps.push(...gaps);
        }
        // Generate recommendations
        for (const partner of uniquePartners) {
            const recs = this.generateRecommendations(partner);
            recommendations.push(...recs);
        }
        return {
            partners: uniquePartners,
            apiSpecs: allApiSpecs,
            complianceGaps,
            recommendations,
        };
    }
    /**
     * Discover partners from a specific source
     */
    async discoverFromSource(source, filter) {
        console.log(`[PartnerDiscovery] Discovering from ${source.name}...`);
        switch (source.type) {
            case 'x-road':
                return this.discoverFromXRoad(source, filter);
            case 'open-data':
                return this.discoverFromOpenData(source, filter);
            case 'registry':
                return this.discoverFromRegistry(source, filter);
            default:
                return { partners: [], apiSpecs: [] };
        }
    }
    /**
     * Discover from X-Road catalog
     */
    async discoverFromXRoad(source, filter) {
        const partners = [];
        const apiSpecs = [];
        // X-Road provides a structured catalog of services
        // Each member organization exposes subsystems with services
        // Simulated discovery of Estonian government services
        const estonianServices = [
            {
                memberCode: 'GOV',
                memberClass: 'COM',
                subsystemCode: 'ria',
                serviceName: 'Estonian Information System Authority',
                services: ['citizen-portal', 'e-residency', 'digital-id'],
            },
            {
                memberCode: 'GOV',
                memberClass: 'COM',
                subsystemCode: 'emta',
                serviceName: 'Estonian Tax and Customs Board',
                services: ['tax-declaration', 'customs-clearance', 'vat-registry'],
            },
            {
                memberCode: 'GOV',
                memberClass: 'COM',
                subsystemCode: 'politsei',
                serviceName: 'Estonian Police and Border Guard',
                services: ['document-verification', 'border-queue', 'criminal-records'],
            },
        ];
        for (const service of estonianServices) {
            // Apply partner type filter
            const partnerType = 'government';
            if (filter?.partnerTypes && !filter.partnerTypes.includes(partnerType)) {
                continue;
            }
            const partner = {
                id: `xroad-${source.region.toLowerCase()}-${service.subsystemCode}`,
                name: service.serviceName,
                type: partnerType,
                region: source.region,
                country: source.region === 'Baltic' ? 'EE' : 'FI',
                languageCode: source.region === 'Baltic' ? 'et' : 'fi',
                authMethod: 'x-road',
                complianceRequirements: ['GDPR', 'eIDAS'],
                dataClassification: 'confidential',
                status: 'discovered',
                discoveredAt: new Date(),
                metadata: {
                    memberCode: service.memberCode,
                    memberClass: service.memberClass,
                    subsystemCode: service.subsystemCode,
                    availableServices: service.services,
                    xRoadInstance: source.region === 'Baltic' ? 'EE' : 'FI',
                },
            };
            partners.push(partner);
            // Generate API spec for each service
            const apiSpec = this.generateXRoadAPISpec(partner, service.services);
            apiSpecs.push(apiSpec);
        }
        return { partners, apiSpecs };
    }
    /**
     * Generate X-Road API specification
     */
    generateXRoadAPISpec(partner, services) {
        return {
            partnerId: partner.id,
            format: 'x-road',
            version: '4.0',
            endpoints: services.map((svc) => ({
                path: `/${partner.metadata.subsystemCode}/${svc}`,
                method: 'POST',
                description: `${svc} service`,
                parameters: [],
                responses: [
                    { statusCode: 200, schema: {}, description: 'Success' },
                    { statusCode: 500, schema: {}, description: 'Service error' },
                ],
                requiredScopes: [`xroad:${svc}:read`],
            })),
            authentication: {
                type: 'x-road',
                flows: {
                    clientCertificate: {
                        description: 'X-Road member certificate',
                    },
                },
            },
            dataModels: [],
        };
    }
    /**
     * Discover from EU Open Data Portal
     */
    async discoverFromOpenData(source, filter) {
        const partners = [];
        const apiSpecs = [];
        // EU Open Data Portal provides datasets from EU institutions and member states
        const euDatasets = [
            {
                id: 'eurostat',
                name: 'Eurostat - European Statistics',
                country: 'EU',
                language: 'en',
                apis: ['statistics', 'indicators', 'regions'],
            },
            {
                id: 'cordis',
                name: 'CORDIS - EU Research Projects',
                country: 'EU',
                language: 'en',
                apis: ['projects', 'organizations', 'publications'],
            },
            {
                id: 'ted',
                name: 'TED - Tenders Electronic Daily',
                country: 'EU',
                language: 'en',
                apis: ['tenders', 'awards', 'contracts'],
            },
        ];
        for (const dataset of euDatasets) {
            const partner = {
                id: `eu-${dataset.id}`,
                name: dataset.name,
                type: 'government',
                region: 'EU',
                country: dataset.country,
                languageCode: dataset.language,
                authMethod: 'api-key',
                complianceRequirements: ['GDPR'],
                dataClassification: 'public',
                status: 'discovered',
                discoveredAt: new Date(),
                metadata: {
                    source: 'EU Open Data Portal',
                    availableAPIs: dataset.apis,
                    license: 'CC-BY-4.0',
                },
            };
            partners.push(partner);
            apiSpecs.push({
                partnerId: partner.id,
                format: 'openapi',
                version: '3.0',
                endpoints: dataset.apis.map((api) => ({
                    path: `/api/${dataset.id}/${api}`,
                    method: 'GET',
                    description: `${api} endpoint`,
                    parameters: [
                        { name: 'limit', type: 'integer', required: false, description: 'Result limit' },
                        { name: 'offset', type: 'integer', required: false, description: 'Result offset' },
                    ],
                    responses: [
                        { statusCode: 200, schema: {}, description: 'Success' },
                    ],
                    requiredScopes: [],
                })),
                authentication: {
                    type: 'apiKey',
                    flows: { header: { name: 'X-API-Key' } },
                },
                dataModels: [],
            });
        }
        return { partners, apiSpecs };
    }
    /**
     * Discover from API registry
     */
    async discoverFromRegistry(source, filter) {
        // API registries vary by region
        return { partners: [], apiSpecs: [] };
    }
    /**
     * Deduplicate partners based on unique identifiers
     */
    deduplicatePartners(partners) {
        const seen = new Map();
        for (const partner of partners) {
            const key = `${partner.country}-${partner.name}`.toLowerCase();
            if (!seen.has(key)) {
                seen.set(key, partner);
            }
        }
        return Array.from(seen.values());
    }
    /**
     * Analyze compliance gaps for a partner
     */
    async analyzeComplianceGaps(partner, requiredFrameworks) {
        const gaps = [];
        const frameworks = requiredFrameworks || partner.complianceRequirements;
        for (const framework of frameworks) {
            const frameworkGaps = this.checkFramework(partner, framework);
            gaps.push(...frameworkGaps);
        }
        return gaps;
    }
    /**
     * Check compliance with a specific framework
     */
    checkFramework(partner, framework) {
        const gaps = [];
        switch (framework) {
            case 'GDPR':
                if (!partner.metadata.dataProcessingAgreement) {
                    gaps.push({
                        partnerId: partner.id,
                        framework: 'GDPR',
                        requirement: 'Data Processing Agreement',
                        currentState: 'Missing',
                        remediation: 'Request DPA from partner or generate standard DPA',
                        severity: 'high',
                    });
                }
                break;
            case 'eIDAS':
                if (partner.authMethod !== 'x-road' && partner.authMethod !== 'mtls') {
                    gaps.push({
                        partnerId: partner.id,
                        framework: 'eIDAS',
                        requirement: 'Qualified Electronic Signature/Seal',
                        currentState: `Using ${partner.authMethod}`,
                        remediation: 'Upgrade to eIDAS-compliant authentication',
                        severity: 'medium',
                    });
                }
                break;
        }
        return gaps;
    }
    /**
     * Generate integration recommendations
     */
    generateRecommendations(partner) {
        const recommendations = [];
        // Security recommendations
        if (partner.authMethod === 'api-key') {
            recommendations.push({
                partnerId: partner.id,
                type: 'security',
                description: 'Upgrade from API key to OAuth2 or mTLS for enhanced security',
                impact: 'high',
                effort: 'medium',
                autoApplicable: false,
            });
        }
        // Performance recommendations
        if (partner.type === 'government') {
            recommendations.push({
                partnerId: partner.id,
                type: 'performance',
                description: 'Enable response caching for frequently accessed government data',
                impact: 'medium',
                effort: 'low',
                autoApplicable: true,
            });
        }
        return recommendations;
    }
    /**
     * Get discovery statistics
     */
    getStatistics() {
        const sourcesByType = {};
        for (const source of this.sources.values()) {
            sourcesByType[source.type] = (sourcesByType[source.type] || 0) + 1;
        }
        return {
            totalSources: this.sources.size,
            sourcesByType,
            cachedPartners: this.discoveredCache.size,
            cachedApiSpecs: this.apiSpecCache.size,
        };
    }
}
exports.PartnerDiscoveryService = PartnerDiscoveryService;
