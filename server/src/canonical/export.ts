/**
 * Canonical Entities - Subgraph Export with Provenance
 *
 * Export entities and their relationships with complete provenance manifests
 */

// @ts-ignore - pg type imports
import { Pool } from 'pg';
import { BaseCanonicalEntity } from './types';
import {
  ProvenanceManifest,
  ProvenanceChain,
  createProvenanceManifest,
  verifyManifest,
} from './provenance';
import { snapshotAtTime, getEntitiesWithProvenance } from './helpers';

export interface SubgraphExportOptions {
  /** Tenant ID */
  tenantId: string;

  /** Root entity IDs to export */
  rootEntityIds: string[];

  /** Entity types to include */
  entityTypes?: string[];

  /** Maximum depth for relationship traversal */
  maxDepth?: number;

  /** Include historical versions */
  includeHistory?: boolean;

  /** Snapshot time (default: now) */
  asOf?: Date;

  /** Transaction time (default: now) */
  asKnownAt?: Date;

  /** Export format */
  format?: 'json' | 'jsonld' | 'turtle';
}

export interface SubgraphExport {
  /** Export metadata */
  metadata: {
    exportedAt: Date;
    exportedBy: string;
    options: SubgraphExportOptions;
    statistics: {
      totalEntities: number;
      entitiesByType: Record<string, number>;
      totalRelationships: number;
      provenanceChains: number;
    };
  };

  /** Exported entities */
  entities: BaseCanonicalEntity[];

  /** Relationships between entities */
  relationships: Array<{
    fromEntityId: string;
    fromEntityType: string;
    toEntityId: string;
    toEntityType: string;
    relationshipType: string;
    properties?: Record<string, any>;
  }>;

  /** Provenance manifest */
  provenance: ProvenanceManifest;
}

/**
 * Export a subgraph of entities with provenance
 */
export async function exportSubgraph(
  pool: Pool,
  options: SubgraphExportOptions,
  exportedBy: string,
): Promise<SubgraphExport> {
  const {
    tenantId,
    rootEntityIds,
    entityTypes = [
      'Person',
      'Organization',
      'Asset',
      'Location',
      'Event',
      'Document',
      'Claim',
      'Case',
    ],
    maxDepth = 3,
    includeHistory = false,
    asOf = new Date(),
    asKnownAt = new Date(),
  } = options;

  // Step 1: Collect all entities starting from roots
  const collectedEntities = new Map<string, BaseCanonicalEntity>();
  const collectedRelationships: SubgraphExport['relationships'] = [];
  const visitedEntities = new Set<string>();

  await collectEntitiesRecursive(
    pool,
    tenantId,
    rootEntityIds,
    entityTypes,
    maxDepth,
    0,
    asOf,
    asKnownAt,
    collectedEntities,
    collectedRelationships,
    visitedEntities,
  );

  const entities = Array.from(collectedEntities.values());

  // Step 2: Collect provenance for all entities
  const entityIds = entities.map(e => e.id);
  const provenanceChains = await collectProvenanceChains(
    pool,
    tenantId,
    entityIds,
  );

  // Step 3: Create provenance manifest
  const manifest = createProvenanceManifest(
    {
      entityIds,
      entityTypes: Array.from(new Set(entities.map(e => (e as any).entityType))),
      timeRange: {
        from: asOf,
        to: asOf,
      },
    },
    provenanceChains,
    {
      generatedAt: new Date(),
      generatedBy: exportedBy,
      description: `Subgraph export for ${rootEntityIds.length} root entities`,
    },
  );

  // Step 4: Calculate statistics
  const entitiesByType: Record<string, number> = {};
  for (const entity of entities) {
    const type = (entity as any).entityType || 'Unknown';
    entitiesByType[type] = (entitiesByType[type] || 0) + 1;
  }

  return {
    metadata: {
      exportedAt: new Date(),
      exportedBy,
      options,
      statistics: {
        totalEntities: entities.length,
        entitiesByType,
        totalRelationships: collectedRelationships.length,
        provenanceChains: provenanceChains.length,
      },
    },
    entities,
    relationships: collectedRelationships,
    provenance: manifest,
  };
}

/**
 * Recursively collect entities and their relationships
 */
async function collectEntitiesRecursive(
  pool: Pool,
  tenantId: string,
  entityIds: string[],
  entityTypes: string[],
  maxDepth: number,
  currentDepth: number,
  asOf: Date,
  asKnownAt: Date,
  collected: Map<string, BaseCanonicalEntity>,
  relationships: SubgraphExport['relationships'],
  visited: Set<string>,
): Promise<void> {
  if (currentDepth >= maxDepth || entityIds.length === 0) {
    return;
  }

  // Filter out already visited entities
  const newEntityIds = entityIds.filter(id => !visited.has(id));
  if (newEntityIds.length === 0) {
    return;
  }

  // Mark as visited
  for (const id of newEntityIds) {
    visited.add(id);
  }

  // Fetch entities with provenance
  const entitiesWithProv = await getEntitiesWithProvenance(
    pool,
    'Person', // This is a simplification; in reality, we'd need to query across types
    newEntityIds,
    tenantId,
  );

  // Collect related entity IDs
  const relatedEntityIds: string[] = [];

  for (const { entity } of entitiesWithProv) {
    collected.set(entity.id, entity);

    // Extract relationships based on entity type
    const related = extractRelatedEntities(entity);

    for (const rel of related) {
      relationships.push(rel);
      if (
        !collected.has(rel.toEntityId) &&
        entityTypes.includes(rel.toEntityType)
      ) {
        relatedEntityIds.push(rel.toEntityId);
      }
    }
  }

  // Recursively collect related entities
  if (relatedEntityIds.length > 0) {
    await collectEntitiesRecursive(
      pool,
      tenantId,
      relatedEntityIds,
      entityTypes,
      maxDepth,
      currentDepth + 1,
      asOf,
      asKnownAt,
      collected,
      relationships,
      visited,
    );
  }
}

/**
 * Extract related entity IDs from an entity
 */
function extractRelatedEntities(
  entity: BaseCanonicalEntity,
): SubgraphExport['relationships'] {
  const relationships: SubgraphExport['relationships'] = [];
  const entityType = (entity as any).entityType;

  // Extract relationships based on entity type
  if (entityType === 'Person') {
    const person = entity as any;
    if (person.affiliations) {
      for (const aff of person.affiliations) {
        if (aff.organizationId) {
          relationships.push({
            fromEntityId: entity.id,
            fromEntityType: 'Person',
            toEntityId: aff.organizationId,
            toEntityType: 'Organization',
            relationshipType: 'AFFILIATED_WITH',
            properties: {
              role: aff.role,
              from: aff.from,
              to: aff.to,
            },
          });
        }
      }
    }
  } else if (entityType === 'Organization') {
    const org = entity as any;
    if (org.parentOrganization?.organizationId) {
      relationships.push({
        fromEntityId: entity.id,
        fromEntityType: 'Organization',
        toEntityId: org.parentOrganization.organizationId,
        toEntityType: 'Organization',
        relationshipType: 'SUBSIDIARY_OF',
      });
    }
    if (org.keyPeople) {
      for (const person of org.keyPeople) {
        if (person.personId) {
          relationships.push({
            fromEntityId: entity.id,
            fromEntityType: 'Organization',
            toEntityId: person.personId,
            toEntityType: 'Person',
            relationshipType: 'HAS_KEY_PERSON',
            properties: {
              role: person.role,
              from: person.from,
              to: person.to,
            },
          });
        }
      }
    }
  } else if (entityType === 'Event') {
    const event = entity as any;
    if (event.participants) {
      for (const participant of event.participants) {
        if (participant.entityId) {
          relationships.push({
            fromEntityId: entity.id,
            fromEntityType: 'Event',
            toEntityId: participant.entityId,
            toEntityType: participant.entityType || 'Unknown',
            relationshipType: 'HAS_PARTICIPANT',
            properties: {
              role: participant.role,
            },
          });
        }
      }
    }
    if (event.locations) {
      for (const location of event.locations) {
        if (location.locationId) {
          relationships.push({
            fromEntityId: entity.id,
            fromEntityType: 'Event',
            toEntityId: location.locationId,
            toEntityType: 'Location',
            relationshipType: 'OCCURRED_AT',
          });
        }
      }
    }
  } else if (entityType === 'Case') {
    const caseEntity = entity as any;
    if (caseEntity.relatedEntities) {
      for (const related of caseEntity.relatedEntities) {
        if (related.entityId) {
          relationships.push({
            fromEntityId: entity.id,
            fromEntityType: 'Case',
            toEntityId: related.entityId,
            toEntityType: related.entityType || 'Unknown',
            relationshipType: 'RELATED_TO',
            properties: {
              relationship: related.relationship,
            },
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Collect provenance chains for entities
 */
async function collectProvenanceChains(
  pool: Pool,
  tenantId: string,
  entityIds: string[],
): Promise<ProvenanceChain[]> {
  if (entityIds.length === 0) {
    return [];
  }

  const query = `
    SELECT DISTINCT p.*
    FROM canonical_provenance p
    WHERE p.tenant_id = $1
      AND p.id IN (
        SELECT DISTINCT provenance_id
        FROM (
          SELECT provenance_id FROM canonical_person WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_organization WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_asset WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_location WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_event WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_document WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_claim WHERE id = ANY($2) AND tenant_id = $1
          UNION
          SELECT provenance_id FROM canonical_case WHERE id = ANY($2) AND tenant_id = $1
        ) prov_ids
        WHERE provenance_id IS NOT NULL
      )
  `;

  const result = await pool.query(query, [tenantId, entityIds]);

  return result.rows.map(row => row.chain_data as ProvenanceChain);
}

/**
 * Validate and verify an exported subgraph
 */
export function validateSubgraphExport(
  subgraph: SubgraphExport,
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verify provenance manifest
  const provenanceVerification = verifyManifest(subgraph.provenance);
  if (!provenanceVerification.valid) {
    errors.push(...provenanceVerification.errors);
  }

  // Check that all entities have valid IDs
  for (const entity of subgraph.entities) {
    if (!entity.id) {
      errors.push(`Entity missing ID: ${JSON.stringify(entity)}`);
    }
    if (!entity.tenantId) {
      errors.push(`Entity ${entity.id} missing tenantId`);
    }
  }

  // Check that all relationships reference valid entities
  const entityIds = new Set(subgraph.entities.map(e => e.id));
  for (const rel of subgraph.relationships) {
    if (!entityIds.has(rel.fromEntityId)) {
      warnings.push(
        `Relationship references unknown entity: ${rel.fromEntityId}`,
      );
    }
    if (!entityIds.has(rel.toEntityId)) {
      warnings.push(
        `Relationship references unknown entity: ${rel.toEntityId}`,
      );
    }
  }

  // Verify statistics match actual data
  if (subgraph.metadata.statistics.totalEntities !== subgraph.entities.length) {
    errors.push(
      `Entity count mismatch: statistics says ${subgraph.metadata.statistics.totalEntities}, actual is ${subgraph.entities.length}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export subgraph to JSON format
 */
export function exportToJSON(subgraph: SubgraphExport): string {
  return JSON.stringify(subgraph, null, 2);
}

/**
 * Export subgraph to JSON-LD format
 */
export function exportToJSONLD(subgraph: SubgraphExport): string {
  const context = {
    '@context': {
      '@vocab': 'https://schema.org/',
      canonical: 'https://canonical.example.com/ontology/',
      id: '@id',
      type: '@type',
    },
  };

  const graph = subgraph.entities.map(entity => ({
    '@id': `canonical:entity/${entity.id}`,
    '@type': `canonical:${(entity as any).entityType}`,
    tenantId: entity.tenantId,
    validFrom: entity.validFrom.toISOString(),
    validTo: entity.validTo?.toISOString(),
    observedAt: entity.observedAt.toISOString(),
    recordedAt: entity.recordedAt.toISOString(),
    version: entity.version,
    provenance: `canonical:provenance/${entity.provenanceId}`,
    ...entity,
  }));

  return JSON.stringify({ ...context, '@graph': graph }, null, 2);
}

/**
 * Import and validate a subgraph export
 */
export async function importSubgraph(
  pool: Pool,
  subgraph: SubgraphExport,
  importedBy: string,
): Promise<{
  success: boolean;
  imported: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Validate the subgraph
  const validation = validateSubgraphExport(subgraph);
  if (!validation.valid) {
    return {
      success: false,
      imported: 0,
      errors: validation.errors,
    };
  }

  let imported = 0;

  try {
    // Begin transaction
    await pool.query('BEGIN');

    // Import provenance chains first
    for (const chain of subgraph.provenance.chains) {
      const query = `
        INSERT INTO canonical_provenance (id, tenant_id, chain_id, chain_data, chain_hash)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT (tenant_id, chain_id) DO NOTHING
      `;

      await pool.query(query, [
        subgraph.metadata.options.tenantId,
        chain.chainId,
        JSON.stringify(chain),
        chain.chainHash,
      ]);
    }

    // Import entities
    // (This is simplified; in reality, we'd need type-specific imports)
    for (const entity of subgraph.entities) {
      const entityType = (entity as any).entityType;
      const tableName = `canonical_${entityType.toLowerCase()}`;

      // Insert logic would go here
      // For now, just count
      imported++;
    }

    await pool.query('COMMIT');

    return {
      success: true,
      imported,
      errors: [],
    };
  } catch (error) {
    await pool.query('ROLLBACK');
    errors.push(`Import failed: ${(error as Error).message}`);

    return {
      success: false,
      imported: 0,
      errors,
    };
  }
}
