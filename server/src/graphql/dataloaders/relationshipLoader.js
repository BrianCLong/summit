"use strict";
// @ts-nocheck
/**
 * Relationship DataLoader - Batch loading for relationships from Neo4j
 * Prevents N+1 query issues when fetching multiple relationships
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelationshipLoader = createRelationshipLoader;
exports.createRelationshipsBySourceLoader = createRelationshipsBySourceLoader;
exports.createRelationshipsByTargetLoader = createRelationshipsByTargetLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
/**
 * Batch function for loading relationships by ID
 */
async function batchLoadRelationships(ids, context) {
    const session = context.neo4jDriver.session();
    try {
        const startTime = Date.now();
        // Single query to fetch all requested relationships
        const result = await session.run(`
      MATCH (from)-[r]->(to)
      WHERE r.id IN $ids AND r.tenantId = $tenantId
      RETURN r, from, to
      `, { ids: ids, tenantId: context.tenantId });
        // Create a map of id -> relationship
        const relationshipMap = new Map();
        result.records.forEach((record) => {
            const rel = record.get('r');
            const from = record.get('from');
            const to = record.get('to');
            const relationship = {
                id: rel.properties.id,
                from: from.properties.id,
                to: to.properties.id,
                type: rel.type,
                props: rel.properties,
                createdAt: rel.properties.createdAt,
                updatedAt: rel.properties.updatedAt,
                tenantId: rel.properties.tenantId,
            };
            relationshipMap.set(relationship.id, relationship);
        });
        const duration = Date.now() - startTime;
        logger.debug({
            batchSize: ids.length,
            found: relationshipMap.size,
            duration,
        }, 'Relationship batch load completed');
        // Return relationships in the same order as requested IDs
        return ids.map((id) => {
            const relationship = relationshipMap.get(id);
            if (!relationship) {
                return new Error(`Relationship not found: ${id}`);
            }
            return relationship;
        });
    }
    catch (error) {
        logger.error({ error, ids }, 'Error in relationship batch loader');
        return ids.map(() => error);
    }
    finally {
        await session.close();
    }
}
/**
 * Creates a new Relationship DataLoader
 */
function createRelationshipLoader(context) {
    return new dataloader_1.default((ids) => batchLoadRelationships(ids, context), {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * DataLoader for fetching relationships by source entity ID
 * Key is source entity ID, value is array of relationships
 */
function createRelationshipsBySourceLoader(context) {
    return new dataloader_1.default(async (sourceIds) => {
        const session = context.neo4jDriver.session();
        try {
            const result = await session.run(`
          MATCH (from:Entity)-[r]->(to:Entity)
          WHERE from.id IN $sourceIds
            AND from.tenantId = $tenantId
            AND r.tenantId = $tenantId
          RETURN from.id as sourceId, collect({
            id: r.id,
            from: from.id,
            to: to.id,
            type: type(r),
            props: properties(r)
          }) as relationships
          `, { sourceIds: sourceIds, tenantId: context.tenantId });
            const relationshipsBySource = new Map();
            result.records.forEach((record) => {
                const sourceId = record.get('sourceId');
                const relationships = record.get('relationships').map((r) => ({
                    id: r.id,
                    from: r.from,
                    to: r.to,
                    type: r.type,
                    props: r.props,
                    createdAt: r.props.createdAt,
                    updatedAt: r.props.updatedAt,
                    tenantId: r.props.tenantId,
                }));
                relationshipsBySource.set(sourceId, relationships);
            });
            return sourceIds.map((id) => relationshipsBySource.get(id) || []);
        }
        finally {
            await session.close();
        }
    }, {
        cache: true,
        maxBatchSize: 50,
    });
}
/**
 * DataLoader for fetching relationships by target entity ID
 */
function createRelationshipsByTargetLoader(context) {
    return new dataloader_1.default(async (targetIds) => {
        const session = context.neo4jDriver.session();
        try {
            const result = await session.run(`
          MATCH (from:Entity)-[r]->(to:Entity)
          WHERE to.id IN $targetIds
            AND to.tenantId = $tenantId
            AND r.tenantId = $tenantId
          RETURN to.id as targetId, collect({
            id: r.id,
            from: from.id,
            to: to.id,
            type: type(r),
            props: properties(r)
          }) as relationships
          `, { targetIds: targetIds, tenantId: context.tenantId });
            const relationshipsByTarget = new Map();
            result.records.forEach((record) => {
                const targetId = record.get('targetId');
                const relationships = record.get('relationships').map((r) => ({
                    id: r.id,
                    from: r.from,
                    to: r.to,
                    type: r.type,
                    props: r.props,
                    createdAt: r.props.createdAt,
                    updatedAt: r.props.updatedAt,
                    tenantId: r.props.tenantId,
                }));
                relationshipsByTarget.set(targetId, relationships);
            });
            return targetIds.map((id) => relationshipsByTarget.get(id) || []);
        }
        finally {
            await session.close();
        }
    }, {
        cache: true,
        maxBatchSize: 50,
    });
}
