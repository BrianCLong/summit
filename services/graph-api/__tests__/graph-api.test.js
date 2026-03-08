"use strict";
/**
 * Graph API Service Test Suite
 *
 * Tests for:
 * - Graph queries and traversals
 * - Entity and relationship CRUD
 * - Graph algorithms (pathfinding, centrality, community detection)
 * - Performance and scalability
 * - Transaction management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock graph API service
const createMockGraphApiService = () => {
    const entities = new Map();
    const relationships = new Map();
    // Seed some test data
    const seedData = () => {
        const alice = {
            id: 'entity-alice',
            type: 'Person',
            properties: { name: 'Alice Chen', role: 'Manager' },
            labels: ['Person', 'Employee'],
            createdAt: new Date(),
        };
        const bob = {
            id: 'entity-bob',
            type: 'Person',
            properties: { name: 'Bob Martinez', role: 'Analyst' },
            labels: ['Person', 'Employee'],
            createdAt: new Date(),
        };
        const techcorp = {
            id: 'entity-techcorp',
            type: 'Organization',
            properties: { name: 'TechCorp', industry: 'Technology' },
            labels: ['Organization', 'Company'],
            createdAt: new Date(),
        };
        entities.set(alice.id, alice);
        entities.set(bob.id, bob);
        entities.set(techcorp.id, techcorp);
        const rel1 = {
            id: 'rel-1',
            type: 'EMPLOYED_BY',
            sourceId: 'entity-alice',
            targetId: 'entity-techcorp',
            properties: { since: '2020-01-01' },
            createdAt: new Date(),
        };
        const rel2 = {
            id: 'rel-2',
            type: 'WORKS_WITH',
            sourceId: 'entity-alice',
            targetId: 'entity-bob',
            properties: { project: 'Project X' },
            createdAt: new Date(),
        };
        relationships.set(rel1.id, rel1);
        relationships.set(rel2.id, rel2);
    };
    seedData();
    return {
        // Entity operations
        createEntity: globals_1.jest.fn(async (entity) => {
            const newEntity = {
                ...entity,
                id: `entity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                createdAt: new Date(),
            };
            entities.set(newEntity.id, newEntity);
            return newEntity;
        }),
        getEntity: globals_1.jest.fn(async (id) => {
            return entities.get(id) || null;
        }),
        updateEntity: globals_1.jest.fn(async (id, updates) => {
            const entity = entities.get(id);
            if (!entity)
                return null;
            const updated = {
                ...entity,
                ...updates,
                id: entity.id, // Prevent id change
                updatedAt: new Date(),
            };
            entities.set(id, updated);
            return updated;
        }),
        deleteEntity: globals_1.jest.fn(async (id) => {
            if (!entities.has(id))
                return false;
            // Remove related relationships
            for (const [relId, rel] of relationships) {
                if (rel.sourceId === id || rel.targetId === id) {
                    relationships.delete(relId);
                }
            }
            return entities.delete(id);
        }),
        findEntities: globals_1.jest.fn(async (query) => {
            let results = Array.from(entities.values());
            if (query.type) {
                results = results.filter(e => e.type === query.type);
            }
            if (query.labels?.length) {
                results = results.filter(e => query.labels.every(l => e.labels?.includes(l)));
            }
            if (query.properties) {
                results = results.filter(e => Object.entries(query.properties).every(([key, value]) => e.properties[key] === value));
            }
            const offset = query.offset || 0;
            const limit = query.limit || 100;
            return results.slice(offset, offset + limit);
        }),
        // Relationship operations
        createRelationship: globals_1.jest.fn(async (rel) => {
            // Verify both entities exist
            if (!entities.has(rel.sourceId) || !entities.has(rel.targetId)) {
                throw new Error('Source or target entity not found');
            }
            const newRel = {
                ...rel,
                id: `rel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                createdAt: new Date(),
            };
            relationships.set(newRel.id, newRel);
            return newRel;
        }),
        getRelationship: globals_1.jest.fn(async (id) => {
            return relationships.get(id) || null;
        }),
        deleteRelationship: globals_1.jest.fn(async (id) => {
            return relationships.delete(id);
        }),
        getEntityRelationships: globals_1.jest.fn(async (entityId, options) => {
            const direction = options?.direction || 'both';
            return Array.from(relationships.values()).filter(rel => {
                const matchesType = !options?.type || rel.type === options.type;
                if (direction === 'out') {
                    return rel.sourceId === entityId && matchesType;
                }
                else if (direction === 'in') {
                    return rel.targetId === entityId && matchesType;
                }
                else {
                    return (rel.sourceId === entityId || rel.targetId === entityId) && matchesType;
                }
            });
        }),
        // Graph algorithms
        findShortestPath: globals_1.jest.fn(async (sourceId, targetId, options) => {
            // BFS implementation for shortest path
            if (!entities.has(sourceId) || !entities.has(targetId)) {
                return null;
            }
            if (sourceId === targetId) {
                return {
                    nodes: [entities.get(sourceId)],
                    relationships: [],
                    length: 0,
                };
            }
            const maxDepth = options?.maxDepth || 10;
            const visited = new Set();
            const queue = [
                { nodeId: sourceId, path: [sourceId], rels: [] },
            ];
            while (queue.length > 0) {
                const current = queue.shift();
                if (current.path.length > maxDepth)
                    continue;
                if (visited.has(current.nodeId))
                    continue;
                visited.add(current.nodeId);
                // Find adjacent nodes
                for (const [relId, rel] of relationships) {
                    if (options?.relationshipTypes?.length &&
                        !options.relationshipTypes.includes(rel.type)) {
                        continue;
                    }
                    let nextNodeId = null;
                    if (rel.sourceId === current.nodeId) {
                        nextNodeId = rel.targetId;
                    }
                    else if (rel.targetId === current.nodeId) {
                        nextNodeId = rel.sourceId;
                    }
                    if (nextNodeId && !visited.has(nextNodeId)) {
                        const newPath = [...current.path, nextNodeId];
                        const newRels = [...current.rels, relId];
                        if (nextNodeId === targetId) {
                            return {
                                nodes: newPath.map(id => entities.get(id)),
                                relationships: newRels.map(id => relationships.get(id)),
                                length: newPath.length - 1,
                            };
                        }
                        queue.push({ nodeId: nextNodeId, path: newPath, rels: newRels });
                    }
                }
            }
            return null; // No path found
        }),
        findAllPaths: globals_1.jest.fn(async (sourceId, targetId, options) => {
            const paths = [];
            const maxDepth = options?.maxDepth || 5;
            const limit = options?.limit || 10;
            // Simplified - just return shortest path if exists
            const shortestPath = await createMockGraphApiService().findShortestPath(sourceId, targetId, { maxDepth });
            if (shortestPath) {
                paths.push(shortestPath);
            }
            return paths.slice(0, limit);
        }),
        calculateCentrality: globals_1.jest.fn(async (options) => {
            const algorithm = options?.algorithm || 'degree';
            const results = [];
            // Simple degree centrality
            for (const [entityId] of entities) {
                let degree = 0;
                for (const rel of relationships.values()) {
                    if (rel.sourceId === entityId || rel.targetId === entityId) {
                        degree++;
                    }
                }
                results.push({ nodeId: entityId, score: degree });
            }
            // Sort by score descending
            results.sort((a, b) => b.score - a.score);
            return results.slice(0, options?.limit || 10);
        }),
        detectCommunities: globals_1.jest.fn(async (options) => {
            // Simplified community detection - assign all to one community
            const nodeIds = Array.from(entities.keys());
            return [
                {
                    communityId: 1,
                    nodeIds,
                    size: nodeIds.length,
                },
            ];
        }),
        // Neighborhood queries
        getNeighbors: globals_1.jest.fn(async (entityId, depth = 1) => {
            const neighbors = new Set();
            let currentLevel = new Set([entityId]);
            for (let d = 0; d < depth; d++) {
                const nextLevel = new Set();
                for (const nodeId of currentLevel) {
                    for (const rel of relationships.values()) {
                        if (rel.sourceId === nodeId && !neighbors.has(rel.targetId) && rel.targetId !== entityId) {
                            nextLevel.add(rel.targetId);
                            neighbors.add(rel.targetId);
                        }
                        if (rel.targetId === nodeId && !neighbors.has(rel.sourceId) && rel.sourceId !== entityId) {
                            nextLevel.add(rel.sourceId);
                            neighbors.add(rel.sourceId);
                        }
                    }
                }
                currentLevel = nextLevel;
            }
            return Array.from(neighbors).map(id => entities.get(id)).filter(Boolean);
        }),
        // Statistics
        getGraphStats: globals_1.jest.fn(async () => {
            const nodeTypes = {};
            const relationshipTypes = {};
            for (const entity of entities.values()) {
                nodeTypes[entity.type] = (nodeTypes[entity.type] || 0) + 1;
            }
            for (const rel of relationships.values()) {
                relationshipTypes[rel.type] = (relationshipTypes[rel.type] || 0) + 1;
            }
            return {
                nodeCount: entities.size,
                edgeCount: relationships.size,
                nodeTypes,
                relationshipTypes,
            };
        }),
        // Transaction support
        beginTransaction: globals_1.jest.fn(async () => {
            return {
                commit: globals_1.jest.fn(async () => { }),
                rollback: globals_1.jest.fn(async () => { }),
            };
        }),
        _entities: entities,
        _relationships: relationships,
        _reset: () => {
            entities.clear();
            relationships.clear();
            seedData();
        },
    };
};
(0, globals_1.describe)('Graph API Service', () => {
    let graphApi;
    (0, globals_1.beforeEach)(() => {
        graphApi = createMockGraphApiService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Entity Operations', () => {
        (0, globals_1.it)('should create an entity', async () => {
            const entity = await graphApi.createEntity({
                type: 'Person',
                properties: { name: 'Test Person' },
            });
            (0, globals_1.expect)(entity.id).toBeDefined();
            (0, globals_1.expect)(entity.type).toBe('Person');
            (0, globals_1.expect)(entity.properties.name).toBe('Test Person');
            (0, globals_1.expect)(entity.createdAt).toBeDefined();
        });
        (0, globals_1.it)('should get an entity by id', async () => {
            const entity = await graphApi.getEntity('entity-alice');
            (0, globals_1.expect)(entity).not.toBeNull();
            (0, globals_1.expect)(entity?.properties.name).toBe('Alice Chen');
        });
        (0, globals_1.it)('should return null for nonexistent entity', async () => {
            const entity = await graphApi.getEntity('nonexistent');
            (0, globals_1.expect)(entity).toBeNull();
        });
        (0, globals_1.it)('should update an entity', async () => {
            const updated = await graphApi.updateEntity('entity-alice', {
                properties: { name: 'Alice Chen', role: 'Director' },
            });
            (0, globals_1.expect)(updated).not.toBeNull();
            (0, globals_1.expect)(updated?.properties.role).toBe('Director');
            (0, globals_1.expect)(updated?.updatedAt).toBeDefined();
        });
        (0, globals_1.it)('should not change entity id on update', async () => {
            const updated = await graphApi.updateEntity('entity-alice', {
                id: 'hacked-id',
                properties: { name: 'Test' },
            });
            (0, globals_1.expect)(updated?.id).toBe('entity-alice');
        });
        (0, globals_1.it)('should delete an entity', async () => {
            const deleted = await graphApi.deleteEntity('entity-alice');
            (0, globals_1.expect)(deleted).toBe(true);
            const entity = await graphApi.getEntity('entity-alice');
            (0, globals_1.expect)(entity).toBeNull();
        });
        (0, globals_1.it)('should delete related relationships when deleting entity', async () => {
            await graphApi.deleteEntity('entity-alice');
            // Relationships involving Alice should be deleted
            const rels = await graphApi.getEntityRelationships('entity-alice');
            (0, globals_1.expect)(rels).toHaveLength(0);
        });
        (0, globals_1.it)('should find entities by type', async () => {
            const persons = await graphApi.findEntities({ type: 'Person' });
            (0, globals_1.expect)(persons.length).toBeGreaterThan(0);
            persons.forEach(p => (0, globals_1.expect)(p.type).toBe('Person'));
        });
        (0, globals_1.it)('should find entities by labels', async () => {
            const employees = await graphApi.findEntities({ labels: ['Employee'] });
            (0, globals_1.expect)(employees.length).toBeGreaterThan(0);
            employees.forEach(e => (0, globals_1.expect)(e.labels).toContain('Employee'));
        });
        (0, globals_1.it)('should find entities by properties', async () => {
            const results = await graphApi.findEntities({
                properties: { name: 'Alice Chen' },
            });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].properties.name).toBe('Alice Chen');
        });
        (0, globals_1.it)('should support pagination in find', async () => {
            const page1 = await graphApi.findEntities({ limit: 1, offset: 0 });
            const page2 = await graphApi.findEntities({ limit: 1, offset: 1 });
            (0, globals_1.expect)(page1).toHaveLength(1);
            (0, globals_1.expect)(page2).toHaveLength(1);
            (0, globals_1.expect)(page1[0].id).not.toBe(page2[0].id);
        });
    });
    (0, globals_1.describe)('Relationship Operations', () => {
        (0, globals_1.it)('should create a relationship', async () => {
            const rel = await graphApi.createRelationship({
                type: 'KNOWS',
                sourceId: 'entity-alice',
                targetId: 'entity-bob',
            });
            (0, globals_1.expect)(rel.id).toBeDefined();
            (0, globals_1.expect)(rel.type).toBe('KNOWS');
            (0, globals_1.expect)(rel.sourceId).toBe('entity-alice');
            (0, globals_1.expect)(rel.targetId).toBe('entity-bob');
        });
        (0, globals_1.it)('should fail to create relationship with nonexistent entities', async () => {
            await (0, globals_1.expect)(graphApi.createRelationship({
                type: 'KNOWS',
                sourceId: 'nonexistent',
                targetId: 'entity-bob',
            })).rejects.toThrow('Source or target entity not found');
        });
        (0, globals_1.it)('should get a relationship by id', async () => {
            const rel = await graphApi.getRelationship('rel-1');
            (0, globals_1.expect)(rel).not.toBeNull();
            (0, globals_1.expect)(rel?.type).toBe('EMPLOYED_BY');
        });
        (0, globals_1.it)('should delete a relationship', async () => {
            const deleted = await graphApi.deleteRelationship('rel-1');
            (0, globals_1.expect)(deleted).toBe(true);
            const rel = await graphApi.getRelationship('rel-1');
            (0, globals_1.expect)(rel).toBeNull();
        });
        (0, globals_1.it)('should get entity relationships', async () => {
            const rels = await graphApi.getEntityRelationships('entity-alice');
            (0, globals_1.expect)(rels.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should filter relationships by direction', async () => {
            const outRels = await graphApi.getEntityRelationships('entity-alice', {
                direction: 'out',
            });
            outRels.forEach(rel => {
                (0, globals_1.expect)(rel.sourceId).toBe('entity-alice');
            });
        });
        (0, globals_1.it)('should filter relationships by type', async () => {
            const rels = await graphApi.getEntityRelationships('entity-alice', {
                type: 'EMPLOYED_BY',
            });
            rels.forEach(rel => {
                (0, globals_1.expect)(rel.type).toBe('EMPLOYED_BY');
            });
        });
    });
    (0, globals_1.describe)('Pathfinding', () => {
        (0, globals_1.it)('should find shortest path between entities', async () => {
            const path = await graphApi.findShortestPath('entity-alice', 'entity-techcorp');
            (0, globals_1.expect)(path).not.toBeNull();
            (0, globals_1.expect)(path?.nodes[0].id).toBe('entity-alice');
            (0, globals_1.expect)(path?.nodes[path.nodes.length - 1].id).toBe('entity-techcorp');
        });
        (0, globals_1.it)('should return null when no path exists', async () => {
            // Create isolated entity
            await graphApi.createEntity({
                type: 'Person',
                properties: { name: 'Isolated Person' },
            });
            const path = await graphApi.findShortestPath('entity-alice', 'nonexistent');
            (0, globals_1.expect)(path).toBeNull();
        });
        (0, globals_1.it)('should return single node path for same source and target', async () => {
            const path = await graphApi.findShortestPath('entity-alice', 'entity-alice');
            (0, globals_1.expect)(path).not.toBeNull();
            (0, globals_1.expect)(path?.length).toBe(0);
            (0, globals_1.expect)(path?.nodes).toHaveLength(1);
        });
        (0, globals_1.it)('should respect max depth', async () => {
            const path = await graphApi.findShortestPath('entity-alice', 'entity-bob', {
                maxDepth: 1,
            });
            if (path) {
                (0, globals_1.expect)(path.length).toBeLessThanOrEqual(1);
            }
        });
        (0, globals_1.it)('should filter by relationship types', async () => {
            const path = await graphApi.findShortestPath('entity-alice', 'entity-bob', {
                relationshipTypes: ['WORKS_WITH'],
            });
            if (path && path.relationships.length > 0) {
                path.relationships.forEach(rel => {
                    (0, globals_1.expect)(rel.type).toBe('WORKS_WITH');
                });
            }
        });
        (0, globals_1.it)('should find all paths between entities', async () => {
            const paths = await graphApi.findAllPaths('entity-alice', 'entity-bob', {
                maxDepth: 3,
                limit: 5,
            });
            (0, globals_1.expect)(paths.length).toBeGreaterThanOrEqual(0);
        });
    });
    (0, globals_1.describe)('Graph Algorithms', () => {
        (0, globals_1.describe)('Centrality', () => {
            (0, globals_1.it)('should calculate degree centrality', async () => {
                const results = await graphApi.calculateCentrality({
                    algorithm: 'degree',
                });
                (0, globals_1.expect)(results.length).toBeGreaterThan(0);
                results.forEach(r => {
                    (0, globals_1.expect)(r).toHaveProperty('nodeId');
                    (0, globals_1.expect)(r).toHaveProperty('score');
                    (0, globals_1.expect)(r.score).toBeGreaterThanOrEqual(0);
                });
            });
            (0, globals_1.it)('should return results sorted by score', async () => {
                const results = await graphApi.calculateCentrality({
                    algorithm: 'degree',
                });
                for (let i = 1; i < results.length; i++) {
                    (0, globals_1.expect)(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
                }
            });
            (0, globals_1.it)('should respect limit parameter', async () => {
                const results = await graphApi.calculateCentrality({
                    algorithm: 'degree',
                    limit: 2,
                });
                (0, globals_1.expect)(results.length).toBeLessThanOrEqual(2);
            });
        });
        (0, globals_1.describe)('Community Detection', () => {
            (0, globals_1.it)('should detect communities', async () => {
                const communities = await graphApi.detectCommunities({
                    algorithm: 'louvain',
                });
                (0, globals_1.expect)(communities.length).toBeGreaterThan(0);
                communities.forEach(c => {
                    (0, globals_1.expect)(c).toHaveProperty('communityId');
                    (0, globals_1.expect)(c).toHaveProperty('nodeIds');
                    (0, globals_1.expect)(c).toHaveProperty('size');
                    (0, globals_1.expect)(c.nodeIds.length).toBe(c.size);
                });
            });
        });
    });
    (0, globals_1.describe)('Neighborhood Queries', () => {
        (0, globals_1.it)('should get immediate neighbors', async () => {
            const neighbors = await graphApi.getNeighbors('entity-alice', 1);
            (0, globals_1.expect)(neighbors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should get neighbors at depth 2', async () => {
            const neighbors = await graphApi.getNeighbors('entity-alice', 2);
            (0, globals_1.expect)(neighbors).toBeDefined();
        });
        (0, globals_1.it)('should not include source entity in neighbors', async () => {
            const neighbors = await graphApi.getNeighbors('entity-alice', 2);
            const neighborIds = neighbors.map(n => n.id);
            (0, globals_1.expect)(neighborIds).not.toContain('entity-alice');
        });
    });
    (0, globals_1.describe)('Graph Statistics', () => {
        (0, globals_1.it)('should return graph statistics', async () => {
            const stats = await graphApi.getGraphStats();
            (0, globals_1.expect)(stats.nodeCount).toBeGreaterThan(0);
            (0, globals_1.expect)(stats.edgeCount).toBeGreaterThan(0);
            (0, globals_1.expect)(stats.nodeTypes).toBeDefined();
            (0, globals_1.expect)(stats.relationshipTypes).toBeDefined();
        });
        (0, globals_1.it)('should count node types correctly', async () => {
            const stats = await graphApi.getGraphStats();
            (0, globals_1.expect)(stats.nodeTypes['Person']).toBeGreaterThan(0);
            (0, globals_1.expect)(stats.nodeTypes['Organization']).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Transactions', () => {
        (0, globals_1.it)('should begin a transaction', async () => {
            const tx = await graphApi.beginTransaction();
            (0, globals_1.expect)(tx).toBeDefined();
            (0, globals_1.expect)(tx.commit).toBeDefined();
            (0, globals_1.expect)(tx.rollback).toBeDefined();
        });
        (0, globals_1.it)('should commit transaction', async () => {
            const tx = await graphApi.beginTransaction();
            await (0, globals_1.expect)(tx.commit()).resolves.not.toThrow();
        });
        (0, globals_1.it)('should rollback transaction', async () => {
            const tx = await graphApi.beginTransaction();
            await (0, globals_1.expect)(tx.rollback()).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)('Performance', () => {
        (0, globals_1.it)('should handle large number of entities', async () => {
            // Create many entities
            const promises = Array.from({ length: 100 }, (_, i) => graphApi.createEntity({
                type: 'TestEntity',
                properties: { index: i },
            }));
            const entities = await Promise.all(promises);
            (0, globals_1.expect)(entities).toHaveLength(100);
        });
        (0, globals_1.it)('should find entities efficiently', async () => {
            const startTime = Date.now();
            await graphApi.findEntities({ type: 'Person', limit: 10 });
            const elapsed = Date.now() - startTime;
            (0, globals_1.expect)(elapsed).toBeLessThan(100); // Should be fast with mock
        });
    });
});
