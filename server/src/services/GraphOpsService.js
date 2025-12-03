import { getNeo4jDriver } from '../config/database.js';
import logger from '../utils/logger.js';

const SUPERNODE_THRESHOLD = 100;
const GLOBAL_EXPANSION_LIMIT = 1000;

async function expandNeighbors(entityId, limit = 50, { traceId } = {}) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  const start = Date.now();
  try {
    // First check degree to flag supernodes
    const degreeRes = await session.run(
      `
      MATCH (n:Entity {id: $entityId})
      RETURN count {(n)--()} as degree
    `,
      { entityId },
    );
    const degree = degreeRes.records[0]?.get('degree').toNumber() || 0;
    const isSupernode = degree > SUPERNODE_THRESHOLD;

    const cypher = `
      MATCH (n:Entity {id: $entityId})-[r]-(m:Entity)
      WITH DISTINCT m, r LIMIT $limit
      RETURN
        collect(DISTINCT {
          id: m.id,
          label: coalesce(m.label, m.id),
          type: head(labels(m)),
          tags: coalesce(m.tags, []),
          degree: 0 // Placeholder, fetching neighbor degree is expensive
        }) AS nodes,
        collect(DISTINCT {
          id: toString(id(r)),
          source: startNode(r).id,
          target: endNode(r).id,
          type: type(r),
          label: r.label
        }) AS edges
    `;
    const res = await session.run(cypher, { entityId, limit: Number(limit) });
    const rec = res.records[0];
    const nodes = rec ? rec.get('nodes') : [];
    const edges = rec ? rec.get('edges') : [];

    const ms = Date.now() - start;
    logger.info('expandNeighbors', { entityId, limit, ms, traceId, degree, isSupernode });

    return {
      nodes: nodes.map(n => ({ ...n, isSupernode: false })), // Neighbors: we don't know yet, simpler to default false
      edges,
      metadata: {
        totalDegree: degree,
        isSupernode
      }
    };
  } finally {
    await session.close();
  }
}

async function expandNeighborhood(
  entityId,
  radius = 1,
  { tenantId, investigationId, traceId } = {},
) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  const start = Date.now();
  try {
    // 1. Check degree of start node
    const degreeRes = await session.run(
      `
      MATCH (n:Entity {id: $entityId, tenantId: $tenantId})
      RETURN count {(n)--()} as degree
    `,
      { entityId, tenantId },
    );
    const degree = degreeRes.records[0]?.get('degree').toNumber() || 0;
    const isSupernode = degree > SUPERNODE_THRESHOLD;

    // 2. Apply Heuristics
    let effectiveRadius = Number(radius);
    let effectiveLimit = GLOBAL_EXPANSION_LIMIT;
    let warning = null;

    if (isSupernode) {
      warning = `Supernode detected (degree: ${degree}). Reducing expansion radius to 1.`;
      effectiveRadius = 1;
      effectiveLimit = 100; // stricter limit for supernodes
      logger.warn(warning, { entityId, degree });
    }

    // 3. Optimized Query to collect all edges in paths
    const safeCypher = `
      MATCH (n:Entity {id: $entityId, tenantId: $tenantId, investigationId: $investigationId})
      MATCH p = (n)-[*1..${effectiveRadius}]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
      WITH p LIMIT $limit
      UNWIND relationships(p) as r
      UNWIND nodes(p) as node
      WITH collect(DISTINCT node) as allNodes, collect(DISTINCT r) as allRels
      RETURN
        [n IN allNodes | {id: n.id, label: coalesce(n.label, n.id), type: head(labels(n)), tags: coalesce(n.tags, [])}] AS nodes,
        [r IN allRels | {id: toString(id(r)), source: startNode(r).id, target: endNode(r).id, type: type(r), label: r.label}] AS edges
    `;

    const res = await session.run(safeCypher, {
      entityId,
      limit: Number(effectiveLimit),
      tenantId,
      investigationId,
    });

    const rec = res.records[0];
    const nodes = rec ? rec.get('nodes') : [];
    const edges = rec ? rec.get('edges') : [];

    const ms = Date.now() - start;
    logger.info('expandNeighborhood', {
      entityId,
      radius: effectiveRadius,
      originalRadius: radius,
      investigationId,
      tenantId,
      ms,
      traceId,
      limit: effectiveLimit,
      isSupernode
    });

    return {
      nodes,
      edges,
      metadata: {
        isSupernode,
        warning,
        truncated: nodes.length >= effectiveLimit || (isSupernode && radius > 1)
      }
    };
  } finally {
    await session.close();
  }
}

export { expandNeighbors, expandNeighborhood };
