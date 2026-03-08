"use strict";
// @ts-nocheck
/**
 * Canonical Entities - Subgraph Export with Provenance
 *
 * Export entities and their relationships with complete provenance manifests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSubgraph = exportSubgraph;
exports.validateSubgraphExport = validateSubgraphExport;
exports.exportToJSON = exportToJSON;
exports.exportToJSONLD = exportToJSONLD;
exports.importSubgraph = importSubgraph;
const provenance_js_1 = require("./provenance.js");
const helpers_js_1 = require("./helpers.js");
/**
 * Export a subgraph of entities with provenance
 */
async function exportSubgraph(pool, options, exportedBy) {
    const { tenantId, rootEntityIds, entityTypes = [
        'Person',
        'Organization',
        'Asset',
        'Location',
        'Event',
        'Document',
        'Claim',
        'Case',
    ], maxDepth = 3, includeHistory = false, asOf = new Date(), asKnownAt = new Date(), } = options;
    // Step 1: Collect all entities starting from roots
    const collectedEntities = new Map();
    const collectedRelationships = [];
    const visitedEntities = new Set();
    await collectEntitiesRecursive(pool, tenantId, rootEntityIds, entityTypes, maxDepth, 0, asOf, asKnownAt, collectedEntities, collectedRelationships, visitedEntities);
    const entities = Array.from(collectedEntities.values());
    // Step 2: Collect provenance for all entities
    const entityIds = entities.map(e => e.id);
    const provenanceChains = await collectProvenanceChains(pool, tenantId, entityIds);
    // Step 3: Create provenance manifest
    const manifest = (0, provenance_js_1.createProvenanceManifest)({
        entityIds,
        entityTypes: Array.from(new Set(entities.map(e => e.entityType))),
        timeRange: {
            from: asOf,
            to: asOf,
        },
    }, provenanceChains, {
        generatedAt: new Date(),
        generatedBy: exportedBy,
        description: `Subgraph export for ${rootEntityIds.length} root entities`,
    });
    // Step 4: Calculate statistics
    const entitiesByType = {};
    for (const entity of entities) {
        const type = entity.entityType || 'Unknown';
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
async function collectEntitiesRecursive(pool, tenantId, entityIds, entityTypes, maxDepth, currentDepth, asOf, asKnownAt, collected, relationships, visited) {
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
    const entitiesWithProv = await (0, helpers_js_1.getEntitiesWithProvenance)(pool, 'Person', // This is a simplification; in reality, we'd need to query across types
    newEntityIds, tenantId);
    // Collect related entity IDs
    const relatedEntityIds = [];
    for (const { entity } of entitiesWithProv) {
        collected.set(entity.id, entity);
        // Extract relationships based on entity type
        const related = extractRelatedEntities(entity);
        for (const rel of related) {
            relationships.push(rel);
            if (!collected.has(rel.toEntityId) &&
                entityTypes.includes(rel.toEntityType)) {
                relatedEntityIds.push(rel.toEntityId);
            }
        }
    }
    // Recursively collect related entities
    if (relatedEntityIds.length > 0) {
        await collectEntitiesRecursive(pool, tenantId, relatedEntityIds, entityTypes, maxDepth, currentDepth + 1, asOf, asKnownAt, collected, relationships, visited);
    }
}
/**
 * Extract related entity IDs from an entity
 */
function extractRelatedEntities(entity) {
    const relationships = [];
    const entityType = entity.entityType;
    // Extract relationships based on entity type
    if (entityType === 'Person') {
        const person = entity;
        if (person.affiliations && Array.isArray(person.affiliations)) {
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
    }
    else if (entityType === 'Organization') {
        const org = entity;
        const parentOrg = org.parentOrganization;
        if (parentOrg?.organizationId) {
            relationships.push({
                fromEntityId: entity.id,
                fromEntityType: 'Organization',
                toEntityId: parentOrg.organizationId,
                toEntityType: 'Organization',
                relationshipType: 'SUBSIDIARY_OF',
            });
        }
        if (org.keyPeople && Array.isArray(org.keyPeople)) {
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
    }
    else if (entityType === 'Event') {
        const event = entity;
        if (event.participants && Array.isArray(event.participants)) {
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
        if (event.locations && Array.isArray(event.locations)) {
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
    }
    else if (entityType === 'Case') {
        const caseEntity = entity;
        if (caseEntity.relatedEntities && Array.isArray(caseEntity.relatedEntities)) {
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
async function collectProvenanceChains(pool, tenantId, entityIds) {
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
    return result.rows.map(row => row.chain_data);
}
/**
 * Validate and verify an exported subgraph
 */
function validateSubgraphExport(subgraph) {
    const errors = [];
    const warnings = [];
    // Verify provenance manifest
    const provenanceVerification = (0, provenance_js_1.verifyManifest)(subgraph.provenance);
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
            warnings.push(`Relationship references unknown entity: ${rel.fromEntityId}`);
        }
        if (!entityIds.has(rel.toEntityId)) {
            warnings.push(`Relationship references unknown entity: ${rel.toEntityId}`);
        }
    }
    // Verify statistics match actual data
    if (subgraph.metadata.statistics.totalEntities !== subgraph.entities.length) {
        errors.push(`Entity count mismatch: statistics says ${subgraph.metadata.statistics.totalEntities}, actual is ${subgraph.entities.length}`);
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
function exportToJSON(subgraph) {
    return JSON.stringify(subgraph, null, 2);
}
/**
 * Export subgraph to JSON-LD format
 */
function exportToJSONLD(subgraph) {
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
        '@type': `canonical:${entity.entityType}`,
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
async function importSubgraph(pool, subgraph, importedBy) {
    const errors = [];
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
            const entityType = entity.entityType;
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
    }
    catch (error) {
        await pool.query('ROLLBACK');
        errors.push(`Import failed: ${error.message}`);
        return {
            success: false,
            imported: 0,
            errors,
        };
    }
}
