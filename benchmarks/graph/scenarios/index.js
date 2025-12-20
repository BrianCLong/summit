/**
 * Benchmark scenarios for Neo4j graph queries
 * Based on production query patterns from Summit
 */

/**
 * Entity CRUD operations
 */
export const entityCrudScenarios = {
  name: 'entity_crud',
  description: 'Entity and relationship CRUD operations',
  setup: async (session, dataset) => {
    // No additional setup needed, using generated dataset
    return { entityIds: dataset.nodes.slice(0, 10).map(n => n.id) };
  },
  queries: [
    {
      name: 'entity_read',
      query: `
        MATCH (e:Entity {id: $entityId})
        RETURN e
      `,
      params: (ctx, dataset) => ({
        entityId: ctx.entityIds[Math.floor(Math.random() * ctx.entityIds.length)]
      })
    },
    {
      name: 'entity_update',
      query: `
        MATCH (e:Entity {id: $entityId})
        SET e.updatedAt = timestamp(),
            e.confidence = $confidence
        RETURN e
      `,
      params: (ctx, dataset) => ({
        entityId: ctx.entityIds[Math.floor(Math.random() * ctx.entityIds.length)],
        confidence: 0.5 + Math.random() * 0.5
      })
    },
    {
      name: 'relationship_read',
      query: `
        MATCH (e:Entity {id: $entityId})-[r:RELATIONSHIP]-(neighbor)
        RETURN e, r, neighbor
        LIMIT 20
      `,
      params: (ctx, dataset) => ({
        entityId: ctx.entityIds[Math.floor(Math.random() * ctx.entityIds.length)]
      })
    }
  ]
};

/**
 * K-hop traversal scenarios (GraphRAG pattern)
 */
export const kHopTraversalScenarios = {
  name: 'k_hop_traversal',
  description: 'Multi-hop neighborhood expansion',
  setup: async (session, dataset) => {
    // Select anchor nodes with high degree for realistic GraphRAG scenarios
    const result = await session.run(`
      MATCH (e:Entity {investigationId: $investigationId})
      MATCH (e)-[r:RELATIONSHIP]-()
      WITH e, count(r) as degree
      ORDER BY degree DESC
      LIMIT 10
      RETURN e.id as id
    `, { investigationId: dataset.metadata.investigationId });

    return {
      anchorIds: result.records.map(r => r.get('id'))
    };
  },
  queries: [
    {
      name: 'k_hop_1',
      query: `
        MATCH (anchor:Entity {id: $anchorId})
        MATCH (anchor)-[r:RELATIONSHIP]-(neighbor)
        RETURN anchor, r, neighbor
      `,
      params: (ctx) => ({
        anchorId: ctx.anchorIds[Math.floor(Math.random() * ctx.anchorIds.length)]
      })
    },
    {
      name: 'k_hop_2',
      query: `
        MATCH (anchor:Entity {id: $anchorId})
        MATCH path = (anchor)-[*1..2]-(node)
        WITH anchor, collect(DISTINCT node) as nodes, collect(DISTINCT relationships(path)) as rels
        RETURN anchor, nodes, rels
      `,
      params: (ctx) => ({
        anchorId: ctx.anchorIds[Math.floor(Math.random() * ctx.anchorIds.length)]
      })
    },
    {
      name: 'k_hop_3',
      query: `
        MATCH (anchor:Entity {id: $anchorId})
        MATCH path = (anchor)-[*1..3]-(node)
        WITH anchor, collect(DISTINCT node) as nodes, collect(DISTINCT relationships(path)) as rels
        RETURN anchor, nodes, rels
      `,
      params: (ctx) => ({
        anchorId: ctx.anchorIds[Math.floor(Math.random() * ctx.anchorIds.length)]
      })
    }
  ]
};

/**
 * Shortest path scenarios
 */
export const shortestPathScenarios = {
  name: 'shortest_path',
  description: 'Shortest path queries between entities',
  setup: async (session, dataset) => {
    // Select random node pairs at varying distances
    const result = await session.run(`
      MATCH (e:Entity {investigationId: $investigationId})
      WITH collect(e.id) as ids
      RETURN ids[toInteger(rand() * size(ids))] as src,
             ids[toInteger(rand() * size(ids))] as dst
      LIMIT 20
    `, { investigationId: dataset.metadata.investigationId });

    return {
      nodePairs: result.records.map(r => ({
        src: r.get('src'),
        dst: r.get('dst')
      }))
    };
  },
  queries: [
    {
      name: 'shortest_path_single',
      query: `
        MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
        MATCH path = shortestPath((src)-[*1..6]-(dst))
        RETURN path, length(path) as pathLength
      `,
      params: (ctx) => {
        const pair = ctx.nodePairs[Math.floor(Math.random() * ctx.nodePairs.length)];
        return { srcId: pair.src, dstId: pair.dst };
      }
    },
    {
      name: 'all_shortest_paths',
      query: `
        MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
        MATCH path = allShortestPaths((src)-[*1..6]-(dst))
        RETURN path, length(path) as pathLength
        LIMIT 10
      `,
      params: (ctx) => {
        const pair = ctx.nodePairs[Math.floor(Math.random() * ctx.nodePairs.length)];
        return { srcId: pair.src, dstId: pair.dst };
      }
    }
  ]
};

/**
 * Centrality measure scenarios
 */
export const centralityScenarios = {
  name: 'centrality',
  description: 'Centrality calculations (degree, betweenness, closeness)',
  setup: async (session, dataset) => {
    return { investigationId: dataset.metadata.investigationId };
  },
  queries: [
    {
      name: 'degree_centrality',
      query: `
        MATCH (n:Entity {investigationId: $investigationId})
        OPTIONAL MATCH (n)-[r:RELATIONSHIP]-()
        WITH n, count(r) as degree
        RETURN n.id as nodeId, n.label as label, degree
        ORDER BY degree DESC
        LIMIT 50
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    },
    {
      name: 'betweenness_centrality_approx',
      query: `
        MATCH (n:Entity {investigationId: $investigationId})
        WITH n LIMIT 20
        MATCH path = allShortestPaths((n)-[*]-(m:Entity {investigationId: $investigationId}))
        WHERE n <> m
        WITH n, length(path) as pathLength, count(path) as pathCount
        RETURN n.id as nodeId, n.label as label,
               avg(pathLength) as avgPathLength,
               sum(pathCount) as totalPaths
        ORDER BY totalPaths DESC
        LIMIT 20
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    },
    {
      name: 'closeness_centrality',
      query: `
        MATCH (n:Entity {investigationId: $investigationId})
        WITH n LIMIT 20
        MATCH path = shortestPath((n)-[*]-(m:Entity {investigationId: $investigationId}))
        WHERE n <> m
        WITH n, avg(length(path)) as avgDistance
        RETURN n.id as nodeId, n.label as label,
               CASE WHEN avgDistance > 0 THEN 1.0/avgDistance ELSE 0 END as closeness
        ORDER BY closeness DESC
        LIMIT 20
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    }
  ]
};

/**
 * Community detection scenarios
 */
export const communityScenarios = {
  name: 'community_detection',
  description: 'Connected components and community structure',
  setup: async (session, dataset) => {
    return { investigationId: dataset.metadata.investigationId };
  },
  queries: [
    {
      name: 'connected_components',
      query: `
        MATCH (n:Entity {investigationId: $investigationId})
        WITH n LIMIT 50
        MATCH path = (n)-[*]-(m:Entity {investigationId: $investigationId})
        WITH n, collect(DISTINCT m.id) as connectedNodes
        WITH n, connectedNodes, size(connectedNodes) as componentSize
        RETURN n.id as nodeId, n.label as label, connectedNodes, componentSize
        ORDER BY componentSize DESC
        LIMIT 10
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    },
    {
      name: 'relationship_pattern_analysis',
      query: `
        MATCH ()-[r:RELATIONSHIP {investigationId: $investigationId}]->()
        WITH type(r) as relationshipType, count(r) as frequency
        RETURN relationshipType, frequency
        ORDER BY frequency DESC
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    }
  ]
};

/**
 * Graph metrics scenarios
 */
export const graphMetricsScenarios = {
  name: 'graph_metrics',
  description: 'Basic graph statistics and metrics',
  setup: async (session, dataset) => {
    return { investigationId: dataset.metadata.investigationId };
  },
  queries: [
    {
      name: 'basic_metrics',
      query: `
        MATCH (n:Entity {investigationId: $investigationId})
        WITH count(n) as nodeCount
        MATCH ()-[r:RELATIONSHIP {investigationId: $investigationId}]->()
        WITH nodeCount, count(r) as edgeCount
        MATCH (n:Entity {investigationId: $investigationId})-[r:RELATIONSHIP]->()
        WITH nodeCount, edgeCount, n.id as nodeId, count(r) as degree
        RETURN
          nodeCount,
          edgeCount,
          avg(degree) as avgDegree,
          max(degree) as maxDegree,
          min(degree) as minDegree,
          stdev(degree) as degreeStdDev
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    },
    {
      name: 'degree_distribution',
      query: `
        MATCH (n:Entity {investigationId: $investigationId})-[r:RELATIONSHIP]->()
        WITH n, count(r) as degree
        WITH degree, count(*) as nodeCount
        RETURN degree, nodeCount
        ORDER BY degree
      `,
      params: (ctx) => ({ investigationId: ctx.investigationId })
    }
  ]
};

/**
 * Scenario groups for different benchmark modes
 */
export const scenarioGroups = {
  quick: [entityCrudScenarios, kHopTraversalScenarios],
  ci: [entityCrudScenarios, kHopTraversalScenarios, shortestPathScenarios, graphMetricsScenarios],
  all: [
    entityCrudScenarios,
    kHopTraversalScenarios,
    shortestPathScenarios,
    centralityScenarios,
    communityScenarios,
    graphMetricsScenarios
  ]
};

export function getScenarios(mode = 'all') {
  const scenarios = scenarioGroups[mode];
  if (!scenarios) {
    throw new Error(`Invalid scenario mode: ${mode}. Use: ${Object.keys(scenarioGroups).join(', ')}`);
  }
  return scenarios;
}
