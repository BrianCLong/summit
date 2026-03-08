"use strict";
/**
 * Temporal Knowledge Graph Support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalKnowledgeGraph = void 0;
const uuid_1 = require("uuid");
class TemporalKnowledgeGraph {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Create a temporal snapshot of an entity
     */
    async createTemporalSnapshot(entityId, validFrom, properties, validTo) {
        const session = this.driver.session();
        try {
            // Get current version
            const versionResult = await session.run(`
        MATCH (e {id: $entityId})-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        RETURN max(s.version) as maxVersion
        `, { entityId });
            const maxVersion = versionResult.records[0]?.get('maxVersion') || 0;
            const newVersion = maxVersion + 1;
            // Create new snapshot
            await session.run(`
        MATCH (e {id: $entityId})
        CREATE (e)-[:HAS_SNAPSHOT]->(s:TemporalSnapshot {
          id: $snapshotId,
          validFrom: datetime($validFrom),
          validTo: $validTo,
          properties: $properties,
          version: $version,
          createdAt: datetime()
        })
        `, {
                entityId,
                snapshotId: (0, uuid_1.v4)(),
                validFrom,
                validTo: validTo ? `datetime(${validTo})` : null,
                properties: JSON.stringify(properties),
                version: newVersion,
            });
            return {
                entityId,
                validFrom,
                validTo,
                properties,
                version: newVersion,
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Query entity state at a specific point in time
     */
    async getEntityAtTime(entityId, timestamp) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e {id: $entityId})-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        WHERE s.validFrom <= datetime($timestamp)
          AND (s.validTo IS NULL OR s.validTo > datetime($timestamp))
        RETURN s
        ORDER BY s.version DESC
        LIMIT 1
        `, { entityId, timestamp });
            if (result.records.length === 0) {
                return null;
            }
            const snapshot = result.records[0].get('s').properties;
            return {
                entityId,
                validFrom: snapshot.validFrom.toString(),
                validTo: snapshot.validTo?.toString(),
                properties: JSON.parse(snapshot.properties),
                version: snapshot.version.toNumber(),
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get entity history (all snapshots)
     */
    async getEntityHistory(entityId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e {id: $entityId})-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        RETURN s
        ORDER BY s.version ASC
        `, { entityId });
            return result.records.map((record) => {
                const snapshot = record.get('s').properties;
                return {
                    entityId,
                    validFrom: snapshot.validFrom.toString(),
                    validTo: snapshot.validTo?.toString(),
                    properties: JSON.parse(snapshot.properties),
                    version: snapshot.version.toNumber(),
                };
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Create temporal relationship
     */
    async createTemporalRelationship(sourceId, targetId, type, validFrom, properties, validTo) {
        const session = this.driver.session();
        try {
            const relationshipId = (0, uuid_1.v4)();
            await session.run(`
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${type.toUpperCase().replace(/[^A-Z0-9_]/g, '_')} {
          id: $relationshipId,
          validFrom: datetime($validFrom),
          validTo: $validTo,
          properties: $properties,
          temporal: true,
          createdAt: datetime()
        }]->(target)
        `, {
                sourceId,
                targetId,
                relationshipId,
                validFrom,
                validTo: validTo ? `datetime(${validTo})` : null,
                properties: JSON.stringify(properties),
            });
            return {
                relationshipId,
                sourceId,
                targetId,
                type,
                validFrom,
                validTo,
                properties,
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Query relationships valid at a specific time
     */
    async getRelationshipsAtTime(entityId, timestamp) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e {id: $entityId})-[r]-(other)
        WHERE r.temporal = true
          AND r.validFrom <= datetime($timestamp)
          AND (r.validTo IS NULL OR r.validTo > datetime($timestamp))
        RETURN r, type(r) as relType,
               startNode(r).id as sourceId,
               endNode(r).id as targetId
        `, { entityId, timestamp });
            return result.records.map((record) => {
                const rel = record.get('r').properties;
                return {
                    relationshipId: rel.id,
                    sourceId: record.get('sourceId'),
                    targetId: record.get('targetId'),
                    type: record.get('relType'),
                    validFrom: rel.validFrom.toString(),
                    validTo: rel.validTo?.toString(),
                    properties: JSON.parse(rel.properties),
                };
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Query entities that changed within a time range
     */
    async getChangesInTimeRange(startTime, endTime) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e)-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        WHERE s.validFrom >= datetime($startTime)
          AND s.validFrom <= datetime($endTime)
        RETURN e.id as entityId, s
        ORDER BY s.validFrom DESC
        `, { startTime, endTime });
            return result.records.map((record) => {
                const snapshot = record.get('s').properties;
                return {
                    entityId: record.get('entityId'),
                    validFrom: snapshot.validFrom.toString(),
                    validTo: snapshot.validTo?.toString(),
                    properties: JSON.parse(snapshot.properties),
                    version: snapshot.version.toNumber(),
                };
            });
        }
        finally {
            await session.close();
        }
    }
}
exports.TemporalKnowledgeGraph = TemporalKnowledgeGraph;
