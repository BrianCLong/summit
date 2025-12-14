const { getNeo4jDriver } = require('../config/database');
const logger = require('../utils/logger');
const { withCache } = require('../utils/cacheHelper');

// Configuration for limits
const MAX_NODES = 2000;
const MAX_EDGES = 5000;
const SUPERNODE_LIMIT = 50; // Limit edges per node to avoid explosion

async function expandNeighbors(entityId, limit = 50, { traceId } = {}) {
  const cacheKey = `graph:neighbors:${entityId}:${limit}`;
  return withCache(cacheKey, 300, async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const start = Date.now();
    try {
      const cypher = `
        MATCH (n:Entity {id: $entityId})
        CALL {
          WITH n
          MATCH (n)-[r]-(m:Entity)
          RETURN m, r
          LIMIT $limit
        }
        RETURN
          collect(DISTINCT {id: m.id, label: coalesce(m.label, m.id), type: head(labels(m)), tags: coalesce(m.tags, [])}) AS nodes,
          collect(DISTINCT {id: toString(id(r)), source: startNode(r).id, target: endNode(r).id, type: type(r), label: r.label}) AS edges
      `;
      const res = await session.run(cypher, { entityId, limit: Number(limit) });
      const rec = res.records[0];
      const nodes = rec ? rec.get('nodes') : [];
      const edges = rec ? rec.get('edges') : [];

      const ms = Date.now() - start;
      logger.info('expandNeighbors', { entityId, limit, ms, traceId });

      return { nodes, edges };
    } finally {
      await session.close();
    }
  });
}

async function expandNeighborhood(
  entityId,
  radius = 1,
  { tenantId, investigationId, traceId } = {},
) {
  const cacheKey = `graph:neighborhood:${tenantId}:${investigationId}:${entityId}:${radius}`;
  // Cache for 5 minutes
  return withCache(cacheKey, 300, async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const start = Date.now();
    try {
      // Optimized Cypher with APOC or simple path expansion limits
      // Using a size limit on the path collection to prevent OOM
      const cypher = `
        MATCH (n:Entity {id: $entityId, tenantId: $tenantId, investigationId: $investigationId})
        CALL apoc.path.subgraphAll(n, {
            maxLevel: $radius,
            limit: $maxNodes,
            labelFilter: '+Entity',
            relationshipFilter: '>'
        })
        YIELD nodes, relationships
        RETURN
          [node IN nodes | {id: node.id, label: coalesce(node.label, node.id), type: head(labels(node)), tags: coalesce(node.tags, [])}] AS nodes,
          [rel IN relationships | {id: toString(id(rel)), source: startNode(rel).id, target: endNode(rel).id, type: type(rel), label: rel.label}] AS edges
      `;

      // Fallback if APOC is not available or for standard Cypher optimization
      // Note: "CALL apoc..." is best, but if we stick to pure Cypher for portability:
      const fallbackCypher = `
        MATCH (n:Entity {id: $entityId, tenantId: $tenantId, investigationId: $investigationId})
        MATCH p = (n)-[r:RELATIONSHIP*1..${Number(radius)}]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
        WHERE size(nodes(p)) <= $radius + 1
        WITH collect(DISTINCT m) AS mNodes, collect(DISTINCT r) AS rels
        // Truncate if too large
        WITH mNodes[0..$maxNodes] AS limitedNodes, rels[0..$maxEdges] AS limitedRels
        RETURN
          [node IN limitedNodes | {id: node.id, label: coalesce(node.label, node.id), type: head(labels(node)), tags: coalesce(node.tags, [])}] AS nodes,
          [rel IN limitedRels | {id: toString(id(rel)), source: startNode(rel).id, target: endNode(rel).id, type: type(rel), label: rel.label}] AS edges
      `;

      const res = await session.run(fallbackCypher, {
        entityId,
        radius: Number(radius),
        tenantId,
        investigationId,
        maxNodes: MAX_NODES,
        maxEdges: MAX_EDGES
      });

      const rec = res.records[0];
      const nodes = rec ? rec.get('nodes') : [];
      const edges = rec ? rec.get('edges') : [];
      const ms = Date.now() - start;
      logger.info('expandNeighborhood', {
        entityId,
        radius,
        investigationId,
        tenantId,
        ms,
        traceId,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
      return { nodes, edges };
    } finally {
      await session.close();
    }
  });
}

module.exports = { expandNeighbors, expandNeighborhood };
