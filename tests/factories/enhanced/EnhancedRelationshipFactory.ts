/**
 * Enhanced Relationship Factory
 *
 * Type-safe factory for generating test graph relationships with traits.
 *
 * @module tests/factories/enhanced
 */

import { defineFactory, getSequence, random } from '../base';

/**
 * Relationship types in IntelGraph
 */
export type RelationshipType =
  | 'RELATED_TO'
  | 'CONNECTED_TO'
  | 'COMMUNICATES_WITH'
  | 'WORKS_AT'
  | 'OWNS'
  | 'MANAGES'
  | 'REPORTS_TO'
  | 'ACCESSED'
  | 'DOWNLOADED'
  | 'UPLOADED'
  | 'CREATED'
  | 'MODIFIED'
  | 'DELETED'
  | 'RESOLVED_TO'
  | 'HOSTS'
  | 'USES'
  | 'TARGETS'
  | 'EXPLOITS'
  | 'ATTRIBUTED_TO'
  | 'INDICATES'
  | 'MITIGATES'
  | 'MEMBER_OF'
  | 'PART_OF'
  | 'LOCATED_IN';

/**
 * Relationship direction
 */
export type RelationshipDirection = 'outgoing' | 'incoming' | 'bidirectional';

/**
 * Relationship interface for tests
 */
export interface TestRelationshipEnhanced {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  direction: RelationshipDirection;
  weight: number;
  confidence: number;
  properties: Record<string, any>;
  source: string;
  investigationId: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  tags: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Enhanced Relationship Factory with comprehensive traits
 */
export const enhancedRelationshipFactory = defineFactory<TestRelationshipEnhanced>({
  defaults: () => {
    const now = new Date();

    return {
      id: random.uuid(),
      type: 'RELATED_TO',
      sourceId: random.uuid(),
      targetId: random.uuid(),
      direction: 'outgoing',
      weight: 1.0,
      confidence: random.number(50, 100) / 100,
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
      type: 'RELATED_TO' as RelationshipType,
    },
    connectedTo: {
      type: 'CONNECTED_TO' as RelationshipType,
    },
    communicatesWith: {
      type: 'COMMUNICATES_WITH' as RelationshipType,
      properties: {
        protocol: random.pick(['HTTP', 'HTTPS', 'TCP', 'UDP', 'DNS']),
        frequency: random.pick(['high', 'medium', 'low']),
      },
    },
    worksAt: {
      type: 'WORKS_AT' as RelationshipType,
      properties: {
        startDate: random.date(365),
        position: 'Employee',
      },
    },
    owns: {
      type: 'OWNS' as RelationshipType,
    },
    manages: {
      type: 'MANAGES' as RelationshipType,
    },
    reportsTo: {
      type: 'REPORTS_TO' as RelationshipType,
    },
    accessed: () => ({
      type: 'ACCESSED' as RelationshipType,
      properties: {
        accessTime: new Date(),
        accessType: random.pick(['read', 'write', 'execute']),
        successful: true,
      },
    }),
    downloaded: () => ({
      type: 'DOWNLOADED' as RelationshipType,
      properties: {
        downloadTime: new Date(),
        size: random.number(1024, 10485760),
        successful: true,
      },
    }),
    uploaded: () => ({
      type: 'UPLOADED' as RelationshipType,
      properties: {
        uploadTime: new Date(),
        size: random.number(1024, 10485760),
        successful: true,
      },
    }),
    resolvedTo: {
      type: 'RESOLVED_TO' as RelationshipType,
      properties: {
        resolver: 'DNS',
        ttl: random.number(60, 86400),
      },
    },
    hosts: {
      type: 'HOSTS' as RelationshipType,
    },
    uses: {
      type: 'USES' as RelationshipType,
    },
    targets: {
      type: 'TARGETS' as RelationshipType,
      properties: {
        intent: random.pick(['reconnaissance', 'exploitation', 'persistence', 'exfiltration']),
      },
    },
    exploits: {
      type: 'EXPLOITS' as RelationshipType,
      properties: {
        exploitMethod: random.pick(['remote', 'local', 'network']),
        successful: random.boolean(),
      },
    },
    attributedTo: {
      type: 'ATTRIBUTED_TO' as RelationshipType,
      properties: {
        attributionConfidence: random.number(50, 100) / 100,
        source: random.pick(['ThreatIntel', 'OSINT', 'Analyst']),
      },
    },
    indicates: {
      type: 'INDICATES' as RelationshipType,
    },
    mitigates: {
      type: 'MITIGATES' as RelationshipType,
    },
    memberOf: {
      type: 'MEMBER_OF' as RelationshipType,
    },
    partOf: {
      type: 'PART_OF' as RelationshipType,
    },
    locatedIn: {
      type: 'LOCATED_IN' as RelationshipType,
      properties: {
        country: random.pick(['US', 'RU', 'CN', 'DE', 'UK']),
        city: 'Unknown',
      },
    },

    // Direction traits
    outgoing: {
      direction: 'outgoing' as RelationshipDirection,
    },
    incoming: {
      direction: 'incoming' as RelationshipDirection,
    },
    bidirectional: {
      direction: 'bidirectional' as RelationshipDirection,
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
      validFrom: random.date(30),
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
      investigationId: random.uuid(),
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
export function createRelationshipBetween(
  sourceId: string,
  targetId: string,
  type: RelationshipType = 'RELATED_TO',
  overrides: Partial<TestRelationshipEnhanced> = {}
): TestRelationshipEnhanced {
  return enhancedRelationshipFactory.build({
    sourceId,
    targetId,
    type,
    ...overrides,
  });
}

/**
 * Helper to create a chain of relationships
 */
export function createRelationshipChain(
  entityIds: string[],
  type: RelationshipType = 'CONNECTED_TO'
): TestRelationshipEnhanced[] {
  const relationships: TestRelationshipEnhanced[] = [];
  for (let i = 0; i < entityIds.length - 1; i++) {
    relationships.push(
      createRelationshipBetween(entityIds[i], entityIds[i + 1], type)
    );
  }
  return relationships;
}

/**
 * Helper to create a hub-and-spoke relationship pattern
 */
export function createHubRelationships(
  hubId: string,
  spokeIds: string[],
  type: RelationshipType = 'CONNECTED_TO'
): TestRelationshipEnhanced[] {
  return spokeIds.map((spokeId) =>
    createRelationshipBetween(hubId, spokeId, type)
  );
}

export default enhancedRelationshipFactory;
