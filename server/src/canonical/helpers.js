"use strict";
// @ts-nocheck
/**
 * Canonical Entities - Helper Functions
 *
 * Utilities for querying and manipulating bitemporal entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshotAtTime = snapshotAtTime;
exports.getEntityHistory = getEntityHistory;
exports.getEntitiesInTimeRange = getEntitiesInTimeRange;
exports.createEntityVersion = createEntityVersion;
exports.correctEntity = correctEntity;
exports.softDeleteEntity = softDeleteEntity;
exports.getEntitiesWithProvenance = getEntitiesWithProvenance;
exports.temporalDistance = temporalDistance;
/**
 * Get a snapshot of entities as they were at a specific point in time
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity to query
 * @param tenantId - Tenant ID
 * @param asOf - Point in valid time (when facts were true)
 * @param asKnownAt - Point in transaction time (what was known then)
 * @returns Entities valid at the specified time
 */
async function snapshotAtTime(pool, entityType, tenantId, asOf = new Date(), asKnownAt) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    const knownAt = asKnownAt || new Date();
    const query = `
    SELECT *
    FROM ${tableName}
    WHERE tenant_id = $1
      AND valid_from <= $2
      AND (valid_to IS NULL OR valid_to > $2)
      AND recorded_at <= $3
      AND deleted = false
    ORDER BY id, recorded_at DESC
  `;
    const result = await pool.query(query, [tenantId, asOf, knownAt]);
    // Deduplicate - keep only the latest known version of each entity
    const entityMap = new Map();
    for (const row of result.rows) {
        const entity = mapRowToEntity(row);
        if (!entityMap.has(entity.id) || entity.recordedAt > entityMap.get(entity.id).recordedAt) {
            entityMap.set(entity.id, entity);
        }
    }
    return Array.from(entityMap.values());
}
/**
 * Get the complete history of an entity
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @param tenantId - Tenant ID
 * @returns All versions of the entity
 */
async function getEntityHistory(pool, entityType, entityId, tenantId) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    const query = `
    SELECT *
    FROM ${tableName}
    WHERE id = $1
      AND tenant_id = $2
    ORDER BY recorded_at ASC, valid_from ASC
  `;
    const result = await pool.query(query, [entityId, tenantId]);
    return result.rows.map(row => mapRowToEntity(row));
}
/**
 * Get entities that were valid during a time range
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity
 * @param tenantId - Tenant ID
 * @param validFrom - Start of time range
 * @param validTo - End of time range
 * @param asKnownAt - Point in transaction time
 * @returns Entities valid during the specified range
 */
async function getEntitiesInTimeRange(pool, entityType, tenantId, validFrom, validTo, asKnownAt = new Date()) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    const query = `
    SELECT DISTINCT ON (id) *
    FROM ${tableName}
    WHERE tenant_id = $1
      AND (
        (valid_from <= $3 AND (valid_to IS NULL OR valid_to > $2))
        OR (valid_from >= $2 AND valid_from < $3)
        OR (valid_to > $2 AND valid_to <= $3)
      )
      AND recorded_at <= $4
      AND deleted = false
    ORDER BY id, recorded_at DESC
  `;
    const result = await pool.query(query, [tenantId, validFrom, validTo, asKnownAt]);
    return result.rows.map(row => mapRowToEntity(row));
}
/**
 * Create a new version of an entity (for corrections or updates)
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity
 * @param entity - The new version of the entity
 * @returns The created entity with generated fields
 */
async function createEntityVersion(pool, entityType, entity) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    const now = new Date();
    // Get column names and values from entity
    const columns = [];
    const values = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(entity)) {
        const columnName = camelToSnake(key);
        columns.push(columnName);
        values.push(value);
    }
    // Set recorded_at to now
    const recordedAtIndex = columns.indexOf('recorded_at');
    if (recordedAtIndex >= 0) {
        values[recordedAtIndex] = now;
    }
    else {
        columns.push('recorded_at');
        values.push(now);
    }
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
    const result = await pool.query(query, values);
    return mapRowToEntity(result.rows[0]);
}
/**
 * Correct an entity retroactively (insert a new version with an earlier valid_from)
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @param tenantId - Tenant ID
 * @param validFrom - When the correction becomes valid
 * @param updates - Fields to update
 * @param modifiedBy - User making the correction
 * @param provenanceId - Provenance ID for the correction
 * @returns The corrected entity version
 */
async function correctEntity(pool, entityType, entityId, tenantId, validFrom, updates, modifiedBy, provenanceId) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    // Get the most recent version as of validFrom
    const baseQuery = `
    SELECT *
    FROM ${tableName}
    WHERE id = $1
      AND tenant_id = $2
      AND valid_from <= $3
      AND (valid_to IS NULL OR valid_to > $3)
    ORDER BY recorded_at DESC
    LIMIT 1
  `;
    const baseResult = await pool.query(baseQuery, [entityId, tenantId, validFrom]);
    if (baseResult.rows.length === 0) {
        throw new Error(`No entity found for correction: ${entityId}`);
    }
    const baseEntity = mapRowToEntity(baseResult.rows[0]);
    // Create new version with updates
    const correctedEntity = {
        ...baseEntity,
        ...updates,
        validFrom,
        validTo: baseEntity.validTo,
        observedAt: new Date(), // Correction observed now
        recordedAt: new Date(), // Will be set by createEntityVersion
        version: baseEntity.version + 1,
        modifiedBy,
        provenanceId,
    };
    // Close the previous version
    const closeQuery = `
    UPDATE ${tableName}
    SET valid_to = $1
    WHERE id = $2
      AND tenant_id = $3
      AND valid_from = $4
      AND recorded_at = $5
  `;
    await pool.query(closeQuery, [
        validFrom,
        entityId,
        tenantId,
        baseEntity.validFrom,
        baseEntity.recordedAt,
    ]);
    // Insert the corrected version
    return createEntityVersion(pool, entityType, correctedEntity);
}
/**
 * Soft delete an entity (set deleted flag and valid_to)
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @param tenantId - Tenant ID
 * @param deletedAt - When the entity was deleted
 * @param modifiedBy - User performing deletion
 */
async function softDeleteEntity(pool, entityType, entityId, tenantId, deletedAt = new Date(), modifiedBy) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    const query = `
    UPDATE ${tableName}
    SET deleted = true,
        valid_to = $1,
        modified_by = $2
    WHERE id = $3
      AND tenant_id = $4
      AND valid_to IS NULL
      AND deleted = false
  `;
    await pool.query(query, [deletedAt, modifiedBy, entityId, tenantId]);
}
/**
 * Get entities with provenance information
 *
 * @param pool - PostgreSQL connection pool
 * @param entityType - Type of entity
 * @param entityIds - Entity IDs
 * @param tenantId - Tenant ID
 * @returns Entities with their provenance chains
 */
async function getEntitiesWithProvenance(pool, entityType, entityIds, tenantId) {
    const tableName = `canonical_${entityType.toLowerCase()}`;
    const query = `
    SELECT e.*, p.chain_data
    FROM ${tableName} e
    LEFT JOIN canonical_provenance p ON e.provenance_id = p.id
    WHERE e.id = ANY($1)
      AND e.tenant_id = $2
      AND e.deleted = false
    ORDER BY e.id, e.recorded_at DESC
  `;
    const result = await pool.query(query, [entityIds, tenantId]);
    // Deduplicate - keep only the latest version of each entity
    const entityMap = new Map();
    for (const row of result.rows) {
        const entity = mapRowToEntity(row);
        if (!entityMap.has(entity.id)) {
            entityMap.set(entity.id, {
                entity,
                provenance: row.chain_data,
            });
        }
    }
    return Array.from(entityMap.values());
}
/**
 * Map a database row to an entity object
 */
function mapRowToEntity(row) {
    const entity = {};
    for (const [key, value] of Object.entries(row)) {
        const camelKey = snakeToCamel(key);
        entity[camelKey] = value;
    }
    return entity;
}
/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
/**
 * Calculate the temporal distance between two entities
 * (useful for determining how much time has passed between versions)
 */
function temporalDistance(entity1, entity2) {
    const validTimeDiff = Math.abs(entity2.validFrom.getTime() - entity1.validFrom.getTime());
    const transactionTimeDiff = Math.abs(entity2.recordedAt.getTime() - entity1.recordedAt.getTime());
    return {
        validTimeDays: validTimeDiff / (1000 * 60 * 60 * 24),
        transactionTimeDays: transactionTimeDiff / (1000 * 60 * 60 * 24),
    };
}
