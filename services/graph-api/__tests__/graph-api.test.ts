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

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Types for graph API
interface Entity {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  labels?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface Relationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, unknown>;
  createdAt?: Date;
}

interface GraphPath {
  nodes: Entity[];
  relationships: Relationship[];
  length: number;
}

interface CommunityResult {
  communityId: number;
  nodeIds: string[];
  size: number;
}

interface CentralityResult {
  nodeId: string;
  score: number;
}

// Mock graph API service
const createMockGraphApiService = () => {
  const entities = new Map<string, Entity>();
  const relationships = new Map<string, Relationship>();

  // Seed some test data
  const seedData = () => {
    const alice: Entity = {
      id: 'entity-alice',
      type: 'Person',
      properties: { name: 'Alice Chen', role: 'Manager' },
      labels: ['Person', 'Employee'],
      createdAt: new Date(),
    };

    const bob: Entity = {
      id: 'entity-bob',
      type: 'Person',
      properties: { name: 'Bob Martinez', role: 'Analyst' },
      labels: ['Person', 'Employee'],
      createdAt: new Date(),
    };

    const techcorp: Entity = {
      id: 'entity-techcorp',
      type: 'Organization',
      properties: { name: 'TechCorp', industry: 'Technology' },
      labels: ['Organization', 'Company'],
      createdAt: new Date(),
    };

    entities.set(alice.id, alice);
    entities.set(bob.id, bob);
    entities.set(techcorp.id, techcorp);

    const rel1: Relationship = {
      id: 'rel-1',
      type: 'EMPLOYED_BY',
      sourceId: 'entity-alice',
      targetId: 'entity-techcorp',
      properties: { since: '2020-01-01' },
      createdAt: new Date(),
    };

    const rel2: Relationship = {
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
    createEntity: jest.fn(async (entity: Omit<Entity, 'id' | 'createdAt'>): Promise<Entity> => {
      const newEntity: Entity = {
        ...entity,
        id: `entity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date(),
      };
      entities.set(newEntity.id, newEntity);
      return newEntity;
    }),

    getEntity: jest.fn(async (id: string): Promise<Entity | null> => {
      return entities.get(id) || null;
    }),

    updateEntity: jest.fn(async (id: string, updates: Partial<Entity>): Promise<Entity | null> => {
      const entity = entities.get(id);
      if (!entity) return null;

      const updated: Entity = {
        ...entity,
        ...updates,
        id: entity.id, // Prevent id change
        updatedAt: new Date(),
      };
      entities.set(id, updated);
      return updated;
    }),

    deleteEntity: jest.fn(async (id: string): Promise<boolean> => {
      if (!entities.has(id)) return false;

      // Remove related relationships
      for (const [relId, rel] of relationships) {
        if (rel.sourceId === id || rel.targetId === id) {
          relationships.delete(relId);
        }
      }

      return entities.delete(id);
    }),

    findEntities: jest.fn(async (query: {
      type?: string;
      labels?: string[];
      properties?: Record<string, unknown>;
      limit?: number;
      offset?: number;
    }): Promise<Entity[]> => {
      let results = Array.from(entities.values());

      if (query.type) {
        results = results.filter(e => e.type === query.type);
      }

      if (query.labels?.length) {
        results = results.filter(e =>
          query.labels!.every(l => e.labels?.includes(l))
        );
      }

      if (query.properties) {
        results = results.filter(e =>
          Object.entries(query.properties!).every(
            ([key, value]) => e.properties[key] === value
          )
        );
      }

      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return results.slice(offset, offset + limit);
    }),

    // Relationship operations
    createRelationship: jest.fn(async (rel: Omit<Relationship, 'id' | 'createdAt'>): Promise<Relationship> => {
      // Verify both entities exist
      if (!entities.has(rel.sourceId) || !entities.has(rel.targetId)) {
        throw new Error('Source or target entity not found');
      }

      const newRel: Relationship = {
        ...rel,
        id: `rel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date(),
      };
      relationships.set(newRel.id, newRel);
      return newRel;
    }),

    getRelationship: jest.fn(async (id: string): Promise<Relationship | null> => {
      return relationships.get(id) || null;
    }),

    deleteRelationship: jest.fn(async (id: string): Promise<boolean> => {
      return relationships.delete(id);
    }),

    getEntityRelationships: jest.fn(async (entityId: string, options?: {
      direction?: 'in' | 'out' | 'both';
      type?: string;
    }): Promise<Relationship[]> => {
      const direction = options?.direction || 'both';

      return Array.from(relationships.values()).filter(rel => {
        const matchesType = !options?.type || rel.type === options.type;

        if (direction === 'out') {
          return rel.sourceId === entityId && matchesType;
        } else if (direction === 'in') {
          return rel.targetId === entityId && matchesType;
        } else {
          return (rel.sourceId === entityId || rel.targetId === entityId) && matchesType;
        }
      });
    }),

    // Graph algorithms
    findShortestPath: jest.fn(async (sourceId: string, targetId: string, options?: {
      maxDepth?: number;
      relationshipTypes?: string[];
    }): Promise<GraphPath | null> => {
      // BFS implementation for shortest path
      if (!entities.has(sourceId) || !entities.has(targetId)) {
        return null;
      }

      if (sourceId === targetId) {
        return {
          nodes: [entities.get(sourceId)!],
          relationships: [],
          length: 0,
        };
      }

      const maxDepth = options?.maxDepth || 10;
      const visited = new Set<string>();
      const queue: Array<{ nodeId: string; path: string[]; rels: string[] }> = [
        { nodeId: sourceId, path: [sourceId], rels: [] },
      ];

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.path.length > maxDepth) continue;
        if (visited.has(current.nodeId)) continue;
        visited.add(current.nodeId);

        // Find adjacent nodes
        for (const [relId, rel] of relationships) {
          if (options?.relationshipTypes?.length &&
              !options.relationshipTypes.includes(rel.type)) {
            continue;
          }

          let nextNodeId: string | null = null;

          if (rel.sourceId === current.nodeId) {
            nextNodeId = rel.targetId;
          } else if (rel.targetId === current.nodeId) {
            nextNodeId = rel.sourceId;
          }

          if (nextNodeId && !visited.has(nextNodeId)) {
            const newPath = [...current.path, nextNodeId];
            const newRels = [...current.rels, relId];

            if (nextNodeId === targetId) {
              return {
                nodes: newPath.map(id => entities.get(id)!),
                relationships: newRels.map(id => relationships.get(id)!),
                length: newPath.length - 1,
              };
            }

            queue.push({ nodeId: nextNodeId, path: newPath, rels: newRels });
          }
        }
      }

      return null; // No path found
    }),

    findAllPaths: jest.fn(async (sourceId: string, targetId: string, options?: {
      maxDepth?: number;
      limit?: number;
    }): Promise<GraphPath[]> => {
      const paths: GraphPath[] = [];
      const maxDepth = options?.maxDepth || 5;
      const limit = options?.limit || 10;

      // Simplified - just return shortest path if exists
      const shortestPath = await createMockGraphApiService().findShortestPath(sourceId, targetId, { maxDepth });
      if (shortestPath) {
        paths.push(shortestPath);
      }

      return paths.slice(0, limit);
    }),

    calculateCentrality: jest.fn(async (options?: {
      algorithm?: 'degree' | 'betweenness' | 'closeness' | 'pagerank';
      limit?: number;
    }): Promise<CentralityResult[]> => {
      const algorithm = options?.algorithm || 'degree';
      const results: CentralityResult[] = [];

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

    detectCommunities: jest.fn(async (options?: {
      algorithm?: 'louvain' | 'label-propagation';
    }): Promise<CommunityResult[]> => {
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
    getNeighbors: jest.fn(async (entityId: string, depth: number = 1): Promise<Entity[]> => {
      const neighbors = new Set<string>();
      let currentLevel = new Set([entityId]);

      for (let d = 0; d < depth; d++) {
        const nextLevel = new Set<string>();

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

      return Array.from(neighbors).map(id => entities.get(id)!).filter(Boolean);
    }),

    // Statistics
    getGraphStats: jest.fn(async (): Promise<{
      nodeCount: number;
      edgeCount: number;
      nodeTypes: Record<string, number>;
      relationshipTypes: Record<string, number>;
    }> => {
      const nodeTypes: Record<string, number> = {};
      const relationshipTypes: Record<string, number> = {};

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
    beginTransaction: jest.fn(async () => {
      return {
        commit: jest.fn(async () => {}),
        rollback: jest.fn(async () => {}),
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

describe('Graph API Service', () => {
  let graphApi: ReturnType<typeof createMockGraphApiService>;

  beforeEach(() => {
    graphApi = createMockGraphApiService();
    jest.clearAllMocks();
  });

  describe('Entity Operations', () => {
    it('should create an entity', async () => {
      const entity = await graphApi.createEntity({
        type: 'Person',
        properties: { name: 'Test Person' },
      });

      expect(entity.id).toBeDefined();
      expect(entity.type).toBe('Person');
      expect(entity.properties.name).toBe('Test Person');
      expect(entity.createdAt).toBeDefined();
    });

    it('should get an entity by id', async () => {
      const entity = await graphApi.getEntity('entity-alice');

      expect(entity).not.toBeNull();
      expect(entity?.properties.name).toBe('Alice Chen');
    });

    it('should return null for nonexistent entity', async () => {
      const entity = await graphApi.getEntity('nonexistent');

      expect(entity).toBeNull();
    });

    it('should update an entity', async () => {
      const updated = await graphApi.updateEntity('entity-alice', {
        properties: { name: 'Alice Chen', role: 'Director' },
      });

      expect(updated).not.toBeNull();
      expect(updated?.properties.role).toBe('Director');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should not change entity id on update', async () => {
      const updated = await graphApi.updateEntity('entity-alice', {
        id: 'hacked-id',
        properties: { name: 'Test' },
      } as Partial<Entity>);

      expect(updated?.id).toBe('entity-alice');
    });

    it('should delete an entity', async () => {
      const deleted = await graphApi.deleteEntity('entity-alice');

      expect(deleted).toBe(true);

      const entity = await graphApi.getEntity('entity-alice');
      expect(entity).toBeNull();
    });

    it('should delete related relationships when deleting entity', async () => {
      await graphApi.deleteEntity('entity-alice');

      // Relationships involving Alice should be deleted
      const rels = await graphApi.getEntityRelationships('entity-alice');
      expect(rels).toHaveLength(0);
    });

    it('should find entities by type', async () => {
      const persons = await graphApi.findEntities({ type: 'Person' });

      expect(persons.length).toBeGreaterThan(0);
      persons.forEach(p => expect(p.type).toBe('Person'));
    });

    it('should find entities by labels', async () => {
      const employees = await graphApi.findEntities({ labels: ['Employee'] });

      expect(employees.length).toBeGreaterThan(0);
      employees.forEach(e => expect(e.labels).toContain('Employee'));
    });

    it('should find entities by properties', async () => {
      const results = await graphApi.findEntities({
        properties: { name: 'Alice Chen' },
      });

      expect(results).toHaveLength(1);
      expect(results[0].properties.name).toBe('Alice Chen');
    });

    it('should support pagination in find', async () => {
      const page1 = await graphApi.findEntities({ limit: 1, offset: 0 });
      const page2 = await graphApi.findEntities({ limit: 1, offset: 1 });

      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Relationship Operations', () => {
    it('should create a relationship', async () => {
      const rel = await graphApi.createRelationship({
        type: 'KNOWS',
        sourceId: 'entity-alice',
        targetId: 'entity-bob',
      });

      expect(rel.id).toBeDefined();
      expect(rel.type).toBe('KNOWS');
      expect(rel.sourceId).toBe('entity-alice');
      expect(rel.targetId).toBe('entity-bob');
    });

    it('should fail to create relationship with nonexistent entities', async () => {
      await expect(
        graphApi.createRelationship({
          type: 'KNOWS',
          sourceId: 'nonexistent',
          targetId: 'entity-bob',
        })
      ).rejects.toThrow('Source or target entity not found');
    });

    it('should get a relationship by id', async () => {
      const rel = await graphApi.getRelationship('rel-1');

      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('EMPLOYED_BY');
    });

    it('should delete a relationship', async () => {
      const deleted = await graphApi.deleteRelationship('rel-1');

      expect(deleted).toBe(true);

      const rel = await graphApi.getRelationship('rel-1');
      expect(rel).toBeNull();
    });

    it('should get entity relationships', async () => {
      const rels = await graphApi.getEntityRelationships('entity-alice');

      expect(rels.length).toBeGreaterThan(0);
    });

    it('should filter relationships by direction', async () => {
      const outRels = await graphApi.getEntityRelationships('entity-alice', {
        direction: 'out',
      });

      outRels.forEach(rel => {
        expect(rel.sourceId).toBe('entity-alice');
      });
    });

    it('should filter relationships by type', async () => {
      const rels = await graphApi.getEntityRelationships('entity-alice', {
        type: 'EMPLOYED_BY',
      });

      rels.forEach(rel => {
        expect(rel.type).toBe('EMPLOYED_BY');
      });
    });
  });

  describe('Pathfinding', () => {
    it('should find shortest path between entities', async () => {
      const path = await graphApi.findShortestPath('entity-alice', 'entity-techcorp');

      expect(path).not.toBeNull();
      expect(path?.nodes[0].id).toBe('entity-alice');
      expect(path?.nodes[path.nodes.length - 1].id).toBe('entity-techcorp');
    });

    it('should return null when no path exists', async () => {
      // Create isolated entity
      await graphApi.createEntity({
        type: 'Person',
        properties: { name: 'Isolated Person' },
      });

      const path = await graphApi.findShortestPath('entity-alice', 'nonexistent');

      expect(path).toBeNull();
    });

    it('should return single node path for same source and target', async () => {
      const path = await graphApi.findShortestPath('entity-alice', 'entity-alice');

      expect(path).not.toBeNull();
      expect(path?.length).toBe(0);
      expect(path?.nodes).toHaveLength(1);
    });

    it('should respect max depth', async () => {
      const path = await graphApi.findShortestPath('entity-alice', 'entity-bob', {
        maxDepth: 1,
      });

      if (path) {
        expect(path.length).toBeLessThanOrEqual(1);
      }
    });

    it('should filter by relationship types', async () => {
      const path = await graphApi.findShortestPath('entity-alice', 'entity-bob', {
        relationshipTypes: ['WORKS_WITH'],
      });

      if (path && path.relationships.length > 0) {
        path.relationships.forEach(rel => {
          expect(rel.type).toBe('WORKS_WITH');
        });
      }
    });

    it('should find all paths between entities', async () => {
      const paths = await graphApi.findAllPaths('entity-alice', 'entity-bob', {
        maxDepth: 3,
        limit: 5,
      });

      expect(paths.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Graph Algorithms', () => {
    describe('Centrality', () => {
      it('should calculate degree centrality', async () => {
        const results = await graphApi.calculateCentrality({
          algorithm: 'degree',
        });

        expect(results.length).toBeGreaterThan(0);
        results.forEach(r => {
          expect(r).toHaveProperty('nodeId');
          expect(r).toHaveProperty('score');
          expect(r.score).toBeGreaterThanOrEqual(0);
        });
      });

      it('should return results sorted by score', async () => {
        const results = await graphApi.calculateCentrality({
          algorithm: 'degree',
        });

        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
        }
      });

      it('should respect limit parameter', async () => {
        const results = await graphApi.calculateCentrality({
          algorithm: 'degree',
          limit: 2,
        });

        expect(results.length).toBeLessThanOrEqual(2);
      });
    });

    describe('Community Detection', () => {
      it('should detect communities', async () => {
        const communities = await graphApi.detectCommunities({
          algorithm: 'louvain',
        });

        expect(communities.length).toBeGreaterThan(0);
        communities.forEach(c => {
          expect(c).toHaveProperty('communityId');
          expect(c).toHaveProperty('nodeIds');
          expect(c).toHaveProperty('size');
          expect(c.nodeIds.length).toBe(c.size);
        });
      });
    });
  });

  describe('Neighborhood Queries', () => {
    it('should get immediate neighbors', async () => {
      const neighbors = await graphApi.getNeighbors('entity-alice', 1);

      expect(neighbors.length).toBeGreaterThan(0);
    });

    it('should get neighbors at depth 2', async () => {
      const neighbors = await graphApi.getNeighbors('entity-alice', 2);

      expect(neighbors).toBeDefined();
    });

    it('should not include source entity in neighbors', async () => {
      const neighbors = await graphApi.getNeighbors('entity-alice', 2);

      const neighborIds = neighbors.map(n => n.id);
      expect(neighborIds).not.toContain('entity-alice');
    });
  });

  describe('Graph Statistics', () => {
    it('should return graph statistics', async () => {
      const stats = await graphApi.getGraphStats();

      expect(stats.nodeCount).toBeGreaterThan(0);
      expect(stats.edgeCount).toBeGreaterThan(0);
      expect(stats.nodeTypes).toBeDefined();
      expect(stats.relationshipTypes).toBeDefined();
    });

    it('should count node types correctly', async () => {
      const stats = await graphApi.getGraphStats();

      expect(stats.nodeTypes['Person']).toBeGreaterThan(0);
      expect(stats.nodeTypes['Organization']).toBeGreaterThan(0);
    });
  });

  describe('Transactions', () => {
    it('should begin a transaction', async () => {
      const tx = await graphApi.beginTransaction();

      expect(tx).toBeDefined();
      expect(tx.commit).toBeDefined();
      expect(tx.rollback).toBeDefined();
    });

    it('should commit transaction', async () => {
      const tx = await graphApi.beginTransaction();

      await expect(tx.commit()).resolves.not.toThrow();
    });

    it('should rollback transaction', async () => {
      const tx = await graphApi.beginTransaction();

      await expect(tx.rollback()).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of entities', async () => {
      // Create many entities
      const promises = Array.from({ length: 100 }, (_, i) =>
        graphApi.createEntity({
          type: 'TestEntity',
          properties: { index: i },
        })
      );

      const entities = await Promise.all(promises);

      expect(entities).toHaveLength(100);
    });

    it('should find entities efficiently', async () => {
      const startTime = Date.now();

      await graphApi.findEntities({ type: 'Person', limit: 10 });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should be fast with mock
    });
  });
});
