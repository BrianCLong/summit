"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_js_1 = require("../../db/neo4j.js");
const node_crypto_1 = require("node:crypto");
const pino_1 = __importDefault(require("pino"));
const graphql_1 = require("graphql");
const subscriptions_js_1 = require("../subscriptions.js");
const auth_js_1 = require("../utils/auth.js");
const logger = pino_1.default();
const driver = (0, neo4j_js_1.getNeo4jDriver)();
const relationshipResolvers = {
    Mutation: {
        createRelationship: (0, auth_js_1.authGuard)(async (_, { input, }, context) => {
            const session = driver.session();
            try {
                const tenantId = context.user.tenantId;
                const id = (0, node_crypto_1.randomUUID)();
                const createdAt = new Date().toISOString();
                const props = {
                    ...input.props,
                    id,
                    createdAt,
                    updatedAt: createdAt,
                    tenantId,
                };
                const result = await session.run(`
          MATCH (fromNode:Entity {id: $from, tenantId: $tenantId})
          MATCH (toNode:Entity {id: $to, tenantId: $tenantId})
          CREATE (fromNode)-[r:${input.type} $props]->(toNode)
          RETURN r
          `, { from: input.from, to: input.to, tenantId, props });
                // Check if entities were found
                if (result.records.length === 0) {
                    throw new graphql_1.GraphQLError('One or both entities not found', {
                        extensions: {
                            code: 'BAD_USER_INPUT',
                            http: { status: 400 },
                            fromEntityId: input.from,
                            toEntityId: input.to,
                        },
                    });
                }
                const record = result.records[0].get('r');
                const relationship = {
                    id: record.properties.id,
                    from: input.from,
                    to: input.to,
                    type: record.type,
                    props: record.properties,
                    createdAt: record.properties.createdAt,
                    tenantId: record.properties.tenantId,
                };
                subscriptions_js_1.pubsub.publish((0, subscriptions_js_1.tenantEvent)(subscriptions_js_1.RELATIONSHIP_CREATED, tenantId), {
                    payload: relationship,
                });
                return relationship;
            }
            catch (error) {
                logger.error({ error, input }, 'Error creating relationship');
                // Re-throw GraphQLErrors as-is to preserve status codes
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new graphql_1.GraphQLError(`Failed to create relationship: ${message}`, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        http: { status: 500 },
                    },
                });
            }
            finally {
                await session.close();
            }
        }),
        updateRelationship: (0, auth_js_1.authGuard)(async (_, { id, input, lastSeenTimestamp, }, context) => {
            const session = driver.session();
            try {
                const tenantId = context.user.tenantId;
                const existing = await session.run('MATCH ()-[r:Relationship {id: $id, tenantId: $tenantId}]->() RETURN r', { id, tenantId });
                if (existing.records.length === 0) {
                    return null;
                }
                const current = existing.records[0].get('r').properties;
                if (current.updatedAt &&
                    new Date(current.updatedAt).toISOString() !==
                        new Date(lastSeenTimestamp).toISOString()) {
                    const err = new Error('Conflict: Relationship has been modified');
                    err.extensions = { code: 'CONFLICT', server: current };
                    throw err;
                }
                const updatedAt = new Date().toISOString();
                let query = 'MATCH ()-[r:Relationship {id: $id, tenantId: $tenantId}]->()';
                const params = { id, updatedAt, tenantId };
                if (input.type) {
                    // Changing relationship type is complex in Neo4j, often involves deleting and recreating
                    // For simplicity, this placeholder will only update properties
                    logger.warn('Changing relationship type is not fully supported in updateRelationship resolver.');
                }
                if (input.props) {
                    query += ' SET r += $props, r.updatedAt = $updatedAt';
                    params.props = input.props;
                }
                else {
                    query += ' SET r.updatedAt = $updatedAt';
                }
                query += ' RETURN r';
                const result = await session.run(query, params);
                if (result.records.length === 0) {
                    return null; // Or throw an error if relationship not found
                }
                const record = result.records[0].get('r');
                const relationship = {
                    id: record.properties.id,
                    from: record.properties.from,
                    to: record.properties.to,
                    type: record.type,
                    props: record.properties,
                    createdAt: record.properties.createdAt,
                    updatedAt: record.properties.updatedAt,
                    tenantId: record.properties.tenantId,
                };
                subscriptions_js_1.pubsub.publish((0, subscriptions_js_1.tenantEvent)(subscriptions_js_1.RELATIONSHIP_UPDATED, tenantId), {
                    payload: relationship,
                });
                return relationship;
            }
            catch (error) {
                logger.error({ error, id, input }, 'Error updating relationship');
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to update relationship: ${message}`);
            }
            finally {
                await session.close();
            }
        }),
        deleteRelationship: (0, auth_js_1.authGuard)(async (_, { id }, context) => {
            const session = driver.session();
            try {
                const tenantId = context.user.tenantId;
                // Soft delete: set a 'deletedAt' timestamp
                const deletedAt = new Date().toISOString();
                const result = await session.run('MATCH ()-[r:Relationship {id: $id, tenantId: $tenantId}]->() SET r.deletedAt = $deletedAt RETURN r', { id, deletedAt, tenantId });
                if (result.records.length === 0) {
                    return false; // Or throw an error if relationship not found
                }
                subscriptions_js_1.pubsub.publish((0, subscriptions_js_1.tenantEvent)(subscriptions_js_1.RELATIONSHIP_DELETED, tenantId), {
                    payload: id,
                });
                return true;
            }
            catch (error) {
                logger.error({ error, id }, 'Error deleting relationship');
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to delete relationship: ${message}`);
            }
            finally {
                await session.close();
            }
        }),
    },
};
exports.default = relationshipResolvers;
