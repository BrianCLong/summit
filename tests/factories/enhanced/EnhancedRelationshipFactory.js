"use strict";
/**
 * Enhanced Relationship Factory
 *
 * Type-safe factory for generating test graph relationships with traits.
 *
 * @module tests/factories/enhanced
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedRelationshipFactory = void 0;
exports.createRelationshipBetween = createRelationshipBetween;
exports.createRelationshipChain = createRelationshipChain;
exports.createHubRelationships = createHubRelationships;
const base_1 = require("../base");
/**
 * Enhanced Relationship Factory with comprehensive traits
 */
exports.enhancedRelationshipFactory = (0, base_1.defineFactory)({
    defaults: () => {
        const now = new Date();
        return {
            id: base_1.random.uuid(),
            type: 'RELATED_TO',
            sourceId: base_1.random.uuid(),
            targetId: base_1.random.uuid(),
            direction: 'outgoing',
            weight: 1.0,
            confidence: base_1.random.number(50, 100) / 100,
            properties: {},
            source: 'test-source',
            investigationId: null,
            validFrom: null,
            validUntil: null,
            tags: [],
            createdBy: 'test-user',
            updatedBy: 'test-user',
            createdAt: now,
            updatedAt: now,
            metadata: {},
        };
    },
    traits: {
        // Relationship type traits
        relatedTo: {
            type: 'RELATED_TO',
        },
        connectedTo: {
            type: 'CONNECTED_TO',
        },
        communicatesWith: {
            type: 'COMMUNICATES_WITH',
            properties: {
                protocol: base_1.random.pick(['HTTP', 'HTTPS', 'TCP', 'UDP', 'DNS']),
                frequency: base_1.random.pick(['high', 'medium', 'low']),
            },
        },
        worksAt: {
            type: 'WORKS_AT',
            properties: {
                startDate: base_1.random.date(365),
                position: 'Employee',
            },
        },
        owns: {
            type: 'OWNS',
        },
        manages: {
            type: 'MANAGES',
        },
        reportsTo: {
            type: 'REPORTS_TO',
        },
        accessed: () => ({
            type: 'ACCESSED',
            properties: {
                accessTime: new Date(),
                accessType: base_1.random.pick(['read', 'write', 'execute']),
                successful: true,
            },
        }),
        downloaded: () => ({
            type: 'DOWNLOADED',
            properties: {
                downloadTime: new Date(),
                size: base_1.random.number(1024, 10485760),
                successful: true,
            },
        }),
        uploaded: () => ({
            type: 'UPLOADED',
            properties: {
                uploadTime: new Date(),
                size: base_1.random.number(1024, 10485760),
                successful: true,
            },
        }),
        resolvedTo: {
            type: 'RESOLVED_TO',
            properties: {
                resolver: 'DNS',
                ttl: base_1.random.number(60, 86400),
            },
        },
        hosts: {
            type: 'HOSTS',
        },
        uses: {
            type: 'USES',
        },
        targets: {
            type: 'TARGETS',
            properties: {
                intent: base_1.random.pick(['reconnaissance', 'exploitation', 'persistence', 'exfiltration']),
            },
        },
        exploits: {
            type: 'EXPLOITS',
            properties: {
                exploitMethod: base_1.random.pick(['remote', 'local', 'network']),
                successful: base_1.random.boolean(),
            },
        },
        attributedTo: {
            type: 'ATTRIBUTED_TO',
            properties: {
                attributionConfidence: base_1.random.number(50, 100) / 100,
                source: base_1.random.pick(['ThreatIntel', 'OSINT', 'Analyst']),
            },
        },
        indicates: {
            type: 'INDICATES',
        },
        mitigates: {
            type: 'MITIGATES',
        },
        memberOf: {
            type: 'MEMBER_OF',
        },
        partOf: {
            type: 'PART_OF',
        },
        locatedIn: {
            type: 'LOCATED_IN',
            properties: {
                country: base_1.random.pick(['US', 'RU', 'CN', 'DE', 'UK']),
                city: 'Unknown',
            },
        },
        // Direction traits
        outgoing: {
            direction: 'outgoing',
        },
        incoming: {
            direction: 'incoming',
        },
        bidirectional: {
            direction: 'bidirectional',
        },
        // Weight/Confidence traits
        strong: {
            weight: 1.0,
            confidence: 0.95,
        },
        moderate: {
            weight: 0.5,
            confidence: 0.7,
        },
        weak: {
            weight: 0.2,
            confidence: 0.4,
        },
        highConfidence: {
            confidence: 0.95,
        },
        lowConfidence: {
            confidence: 0.3,
        },
        // Time-based traits
        temporal: () => ({
            validFrom: base_1.random.date(30),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
        expired: () => ({
            validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            validUntil: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }),
        permanent: {
            validFrom: null,
            validUntil: null,
        },
        // Investigation association
        withInvestigation: () => ({
            investigationId: base_1.random.uuid(),
        }),
        // Source traits
        automated: {
            source: 'automated-detection',
            createdBy: 'system',
            tags: ['automated'],
        },
        manual: {
            source: 'analyst',
            tags: ['manual', 'verified'],
        },
        threatIntel: {
            source: 'threat-intel-feed',
            tags: ['threat-intel'],
        },
    },
});
/**
 * Helper to create a relationship between specific entities
 */
function createRelationshipBetween(sourceId, targetId, type = 'RELATED_TO', overrides = {}) {
    return exports.enhancedRelationshipFactory.build({
        sourceId,
        targetId,
        type,
        ...overrides,
    });
}
/**
 * Helper to create a chain of relationships
 */
function createRelationshipChain(entityIds, type = 'CONNECTED_TO') {
    const relationships = [];
    for (let i = 0; i < entityIds.length - 1; i++) {
        relationships.push(createRelationshipBetween(entityIds[i], entityIds[i + 1], type));
    }
    return relationships;
}
/**
 * Helper to create a hub-and-spoke relationship pattern
 */
function createHubRelationships(hubId, spokeIds, type = 'CONNECTED_TO') {
    return spokeIds.map((spokeId) => createRelationshipBetween(hubId, spokeId, type));
}
exports.default = exports.enhancedRelationshipFactory;
