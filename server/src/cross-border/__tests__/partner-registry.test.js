"use strict";
/**
 * Unit tests for Partner Registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
const partner_registry_js_1 = require("../partner-registry.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('PartnerRegistry', () => {
    let registry;
    (0, globals_1.beforeEach)(() => {
        registry = new partner_registry_js_1.PartnerRegistry(60000); // 60s health check interval
    });
    (0, globals_1.afterEach)(async () => {
        await registry.shutdown();
    });
    (0, globals_1.describe)('initialization', () => {
        (0, globals_1.it)('should initialize with default partners', async () => {
            await registry.initialize();
            const partners = registry.getActivePartners();
            // Should have at least Estonia as active
            (0, globals_1.expect)(partners.length).toBeGreaterThanOrEqual(1);
            const estonia = registry.getPartner('EE');
            (0, globals_1.expect)(estonia).toBeDefined();
            (0, globals_1.expect)(estonia?.name).toContain('Estonia');
        });
    });
    (0, globals_1.describe)('partner registration', () => {
        (0, globals_1.it)('should register a new partner', async () => {
            const partnerData = {
                code: 'DE',
                name: 'Germany Test',
                region: 'EU',
                status: 'active',
                endpoint: {
                    baseUrl: 'https://api.test.de/v1',
                    protocol: 'rest',
                    version: '1.0.0',
                    healthCheckPath: '/health',
                    authMethod: 'jwt',
                },
                capabilities: {
                    domains: ['tax', 'business'],
                    operations: ['query'],
                    maxContextSize: 16000,
                    supportsStreaming: false,
                    supportsMultimodal: false,
                    responseTimeMs: 2000,
                },
                languages: ['de', 'en'],
                trustLevel: {
                    level: 3,
                    maxDataClassification: 'confidential',
                    allowedOperations: ['query', 'verify'],
                    requiresApproval: false,
                    auditRequired: true,
                },
                dataAgreements: [],
            };
            const partner = await registry.registerPartner(partnerData);
            (0, globals_1.expect)(partner.id).toBeDefined();
            (0, globals_1.expect)(partner.code).toBe('DE');
            (0, globals_1.expect)(partner.createdAt).toBeInstanceOf(Date);
            const retrieved = registry.getPartner('DE');
            (0, globals_1.expect)(retrieved).toEqual(partner);
        });
        (0, globals_1.it)('should emit event on partner registration', async () => {
            const eventPromise = new Promise((resolve) => {
                registry.on('partnerRegistered', resolve);
            });
            await registry.registerPartner({
                code: 'PL',
                name: 'Poland Test',
                region: 'EU',
                status: 'pending',
                endpoint: {
                    baseUrl: 'https://api.test.pl/v1',
                    protocol: 'rest',
                    version: '1.0.0',
                    healthCheckPath: '/health',
                    authMethod: 'jwt',
                },
                capabilities: {
                    domains: ['tax'],
                    operations: ['query'],
                    maxContextSize: 8000,
                    supportsStreaming: false,
                    supportsMultimodal: false,
                    responseTimeMs: 3000,
                },
                languages: ['pl', 'en'],
                trustLevel: {
                    level: 2,
                    maxDataClassification: 'internal',
                    allowedOperations: ['query'],
                    requiresApproval: true,
                    auditRequired: true,
                },
                dataAgreements: [],
            });
            const emittedPartner = await eventPromise;
            (0, globals_1.expect)(emittedPartner.code).toBe('PL');
        });
    });
    (0, globals_1.describe)('partner lookup', () => {
        (0, globals_1.beforeEach)(async () => {
            await registry.initialize();
        });
        (0, globals_1.it)('should get partner by code (case insensitive)', () => {
            const partner1 = registry.getPartner('EE');
            const partner2 = registry.getPartner('ee');
            (0, globals_1.expect)(partner1).toBeDefined();
            (0, globals_1.expect)(partner2).toBeDefined();
        });
        (0, globals_1.it)('should return undefined for unknown partner', () => {
            const partner = registry.getPartner('XX');
            (0, globals_1.expect)(partner).toBeUndefined();
        });
        (0, globals_1.it)('should get partners by domain', () => {
            const taxPartners = registry.getPartnersByDomain('tax');
            (0, globals_1.expect)(taxPartners.length).toBeGreaterThan(0);
            (0, globals_1.expect)(taxPartners.every((p) => p.capabilities.domains.includes('tax'))).toBe(true);
        });
        (0, globals_1.it)('should get partners by language', () => {
            const englishPartners = registry.getPartnersByLanguage('en');
            (0, globals_1.expect)(englishPartners.length).toBeGreaterThan(0);
            (0, globals_1.expect)(englishPartners.every((p) => p.languages.includes('en'))).toBe(true);
        });
    });
    (0, globals_1.describe)('data classification handling', () => {
        (0, globals_1.beforeEach)(async () => {
            await registry.initialize();
        });
        (0, globals_1.it)('should check classification compatibility', () => {
            const partner = registry.getPartner('EE');
            (0, globals_1.expect)(partner).toBeDefined();
            // Estonia has trust level 4 (restricted)
            (0, globals_1.expect)(registry.canHandleClassification('EE', 'public')).toBe(true);
            (0, globals_1.expect)(registry.canHandleClassification('EE', 'internal')).toBe(true);
            (0, globals_1.expect)(registry.canHandleClassification('EE', 'confidential')).toBe(true);
            (0, globals_1.expect)(registry.canHandleClassification('EE', 'restricted')).toBe(true);
            (0, globals_1.expect)(registry.canHandleClassification('EE', 'top_secret')).toBe(false);
        });
        (0, globals_1.it)('should return false for unknown partner', () => {
            (0, globals_1.expect)(registry.canHandleClassification('XX', 'public')).toBe(false);
        });
    });
    (0, globals_1.describe)('find best partner', () => {
        (0, globals_1.beforeEach)(async () => {
            await registry.initialize();
        });
        (0, globals_1.it)('should find partner by domain', () => {
            const partner = registry.findBestPartner({ domain: 'tax' });
            (0, globals_1.expect)(partner).toBeDefined();
            (0, globals_1.expect)(partner?.capabilities.domains).toContain('tax');
        });
        (0, globals_1.it)('should filter by language', () => {
            const partner = registry.findBestPartner({
                domain: 'tax',
                language: 'et',
            });
            (0, globals_1.expect)(partner).toBeDefined();
            (0, globals_1.expect)(partner?.languages).toContain('et');
        });
        (0, globals_1.it)('should filter by classification', () => {
            const partner = registry.findBestPartner({
                domain: 'tax',
                classification: 'confidential',
            });
            (0, globals_1.expect)(partner).toBeDefined();
        });
        (0, globals_1.it)('should return null when no match', () => {
            const partner = registry.findBestPartner({
                domain: 'nonexistent_domain',
            });
            (0, globals_1.expect)(partner).toBeNull();
        });
    });
    (0, globals_1.describe)('status updates', () => {
        (0, globals_1.beforeEach)(async () => {
            await registry.initialize();
        });
        (0, globals_1.it)('should update partner status', async () => {
            await registry.updateStatus('EE', 'suspended');
            const partner = registry.getPartner('EE');
            (0, globals_1.expect)(partner?.status).toBe('suspended');
        });
        (0, globals_1.it)('should emit event on status change', async () => {
            const eventPromise = new Promise((resolve) => {
                registry.on('partnerStatusChanged', resolve);
            });
            await registry.updateStatus('EE', 'inactive');
            const event = await eventPromise;
            (0, globals_1.expect)(event.code).toBe('EE');
            (0, globals_1.expect)(event.status).toBe('inactive');
        });
    });
});
