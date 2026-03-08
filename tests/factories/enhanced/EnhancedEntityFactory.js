"use strict";
/**
 * Enhanced Entity Factory
 *
 * Type-safe factory for generating test graph entities with traits.
 *
 * @module tests/factories/enhanced
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.malwareEntityFactory = exports.threatEntityFactory = exports.domainEntityFactory = exports.ipAddressEntityFactory = exports.personEntityFactory = exports.enhancedEntityFactory = void 0;
const base_1 = require("../base");
/**
 * Default properties by entity type
 */
const DEFAULT_PROPERTIES = {
    person: () => ({
        firstName: `Person${(0, base_1.getSequence)('person').next()}`,
        lastName: 'Test',
        email: base_1.random.email('person'),
        phone: '+1-555-0100',
        title: 'Analyst',
    }),
    organization: () => ({
        orgName: `Organization ${(0, base_1.getSequence)('org').next()}`,
        industry: base_1.random.pick(['Technology', 'Finance', 'Healthcare', 'Government']),
        size: base_1.random.pick(['small', 'medium', 'large', 'enterprise']),
        country: 'US',
    }),
    ipAddress: () => ({
        address: base_1.random.ipv4(),
        version: 'IPv4',
        asn: `AS${base_1.random.number(1000, 99999)}`,
        country: base_1.random.pick(['US', 'RU', 'CN', 'DE', 'UK']),
        isMalicious: false,
    }),
    domain: () => ({
        domain: base_1.random.domain(),
        tld: base_1.random.pick(['com', 'org', 'net', 'io']),
        registrar: 'Test Registrar Inc.',
        registrationDate: base_1.random.date(365),
    }),
    email: () => ({
        address: base_1.random.email(),
        isVerified: base_1.random.boolean(),
        domain: base_1.random.domain(),
    }),
    file: () => ({
        filename: `file_${base_1.random.string(8)}.${base_1.random.pick(['exe', 'dll', 'pdf', 'doc'])}`,
        size: base_1.random.number(1024, 10485760),
        mimeType: 'application/octet-stream',
    }),
    hash: () => ({
        value: Array.from({ length: 64 }, () => base_1.random.pick('0123456789abcdef'.split(''))).join(''),
        algorithm: base_1.random.pick(['sha256', 'sha1', 'md5']),
    }),
    url: () => ({
        url: `https://${base_1.random.domain()}/path/${base_1.random.string(8)}`,
        protocol: 'https',
        isActive: true,
    }),
    threat: () => ({
        threatType: base_1.random.pick(['APT', 'Malware', 'Phishing', 'Ransomware']),
        severity: base_1.random.pick(['low', 'medium', 'high', 'critical']),
        mitreTechniques: ['T1566.001', 'T1059.001'],
    }),
    vulnerability: () => ({
        cve: `CVE-2024-${base_1.random.number(1000, 9999)}`,
        cvss: base_1.random.number(1, 100) / 10,
        severity: base_1.random.pick(['low', 'medium', 'high', 'critical']),
        exploitAvailable: base_1.random.boolean(),
    }),
    malware: () => ({
        family: base_1.random.pick(['Emotet', 'TrickBot', 'Cobalt Strike', 'Mimikatz']),
        type: base_1.random.pick(['trojan', 'ransomware', 'backdoor', 'worm']),
        firstSeen: base_1.random.date(365),
    }),
    campaign: () => ({
        campaignName: `Campaign-${base_1.random.string(6).toUpperCase()}`,
        startDate: base_1.random.date(180),
        targetSectors: ['Finance', 'Government'],
        attribution: base_1.random.pick(['APT29', 'APT28', 'Lazarus', 'Unknown']),
    }),
    indicator: () => ({
        indicatorType: base_1.random.pick(['ip', 'domain', 'hash', 'url']),
        value: base_1.random.ipv4(),
        tlp: base_1.random.pick(['white', 'green', 'amber', 'red']),
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
    asset: () => ({
        assetType: base_1.random.pick(['server', 'workstation', 'network', 'application']),
        hostname: `asset-${base_1.random.string(6)}`,
        criticality: base_1.random.pick(['low', 'medium', 'high', 'critical']),
        owner: 'IT Department',
    }),
};
/**
 * Enhanced Entity Factory with comprehensive traits
 */
exports.enhancedEntityFactory = (0, base_1.defineFactory)({
    defaults: () => {
        const seq = (0, base_1.getSequence)('entity').next();
        const type = 'person';
        const now = new Date();
        const confidence = base_1.random.number(50, 100) / 100;
        return {
            id: base_1.random.uuid(),
            type,
            name: `Test Entity ${seq}`,
            description: `Test entity description for entity ${seq}`,
            labels: [type, 'Entity', 'Test'],
            properties: DEFAULT_PROPERTIES[type](),
            confidence,
            confidenceLevel: confidence >= 0.9 ? 'confirmed' : confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
            source: 'test-source',
            sourceReliability: base_1.random.number(1, 6),
            investigationId: null,
            tags: ['test'],
            createdBy: 'test-user',
            updatedBy: 'test-user',
            createdAt: now,
            updatedAt: now,
            metadata: {},
        };
    },
    traits: {
        // Entity type traits
        person: (base) => ({
            type: 'person',
            labels: ['person', 'Entity'],
            properties: DEFAULT_PROPERTIES.person(),
        }),
        organization: (base) => ({
            type: 'organization',
            labels: ['organization', 'Entity'],
            properties: DEFAULT_PROPERTIES.organization(),
        }),
        ipAddress: (base) => ({
            type: 'ipAddress',
            labels: ['ipAddress', 'Entity', 'NetworkIndicator'],
            properties: DEFAULT_PROPERTIES.ipAddress(),
        }),
        domain: (base) => ({
            type: 'domain',
            labels: ['domain', 'Entity', 'NetworkIndicator'],
            properties: DEFAULT_PROPERTIES.domain(),
        }),
        threat: (base) => ({
            type: 'threat',
            labels: ['threat', 'Entity', 'ThreatIntel'],
            properties: DEFAULT_PROPERTIES.threat(),
        }),
        malware: (base) => ({
            type: 'malware',
            labels: ['malware', 'Entity', 'ThreatIntel'],
            properties: DEFAULT_PROPERTIES.malware(),
        }),
        vulnerability: (base) => ({
            type: 'vulnerability',
            labels: ['vulnerability', 'Entity', 'Security'],
            properties: DEFAULT_PROPERTIES.vulnerability(),
        }),
        indicator: (base) => ({
            type: 'indicator',
            labels: ['indicator', 'Entity', 'IOC'],
            properties: DEFAULT_PROPERTIES.indicator(),
        }),
        // Confidence level traits
        highConfidence: {
            confidence: 0.95,
            confidenceLevel: 'confirmed',
        },
        mediumConfidence: {
            confidence: 0.7,
            confidenceLevel: 'medium',
        },
        lowConfidence: {
            confidence: 0.3,
            confidenceLevel: 'low',
        },
        // Source traits
        osint: {
            source: 'OSINT',
            sourceReliability: 3,
        },
        sigint: {
            source: 'SIGINT',
            sourceReliability: 5,
        },
        humint: {
            source: 'HUMINT',
            sourceReliability: 4,
        },
        threatFeed: {
            source: 'Threat Feed',
            sourceReliability: 4,
        },
        // State traits
        withInvestigation: () => ({
            investigationId: base_1.random.uuid(),
        }),
        malicious: (base) => ({
            tags: [...(base.tags || []), 'malicious', 'verified'],
            properties: {
                ...base.properties,
                isMalicious: true,
                verifiedMalicious: true,
            },
        }),
        benign: (base) => ({
            tags: [...(base.tags || []), 'benign', 'verified'],
            properties: {
                ...base.properties,
                isMalicious: false,
                verifiedBenign: true,
            },
        }),
    },
    afterBuild: (entity) => {
        // Ensure labels include the type
        if (!entity.labels.includes(entity.type)) {
            entity.labels = [entity.type, ...entity.labels];
        }
        return entity;
    },
});
/**
 * Convenience factory functions
 */
exports.personEntityFactory = exports.enhancedEntityFactory.extend({
    defaults: () => exports.enhancedEntityFactory.buildWithTrait('person'),
});
exports.ipAddressEntityFactory = exports.enhancedEntityFactory.extend({
    defaults: () => exports.enhancedEntityFactory.buildWithTrait('ipAddress'),
});
exports.domainEntityFactory = exports.enhancedEntityFactory.extend({
    defaults: () => exports.enhancedEntityFactory.buildWithTrait('domain'),
});
exports.threatEntityFactory = exports.enhancedEntityFactory.extend({
    defaults: () => exports.enhancedEntityFactory.buildWithTraits(['threat', 'highConfidence']),
});
exports.malwareEntityFactory = exports.enhancedEntityFactory.extend({
    defaults: () => exports.enhancedEntityFactory.buildWithTraits(['malware', 'threatFeed']),
});
exports.default = exports.enhancedEntityFactory;
