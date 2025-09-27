const { getNeo4jDriver } = require("../config/database");
const logger = require("../utils/logger");

async function expandNeighbors(
  entityId,
  limit = 50,
  { tenantId, traceId } = {},
) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  const start = Date.now();
  try {
    const cypher = `
      MATCH (n:Entity {id: $entityId, _tenantId: $tenantId})-[r]-(m:Entity)
      WHERE m._tenantId = $tenantId
      WITH DISTINCT m, r LIMIT $limit
      RETURN
        collect(DISTINCT {id: m.id, label: coalesce(m.label, m.id), type: head(labels(m)), tags: coalesce(m.tags, [])}) AS nodes,
        collect(DISTINCT {id: toString(id(r)), source: startNode(r).id, target: endNode(r).id, type: type(r), label: r.label}) AS edges
    `;
    const res = await session.run(cypher, {
      entityId,
      tenantId,
      limit: Number(limit),
    });
    const rec = res.records[0];
    const nodes = rec ? rec.get("nodes") : [];
    const edges = rec ? rec.get("edges") : [];

    const ms = Date.now() - start;
    logger.info("expandNeighbors", { entityId, limit, tenantId, ms, traceId });

    return { nodes, edges };
  } finally {
    await session.close();
  }
}

module.exports = { expandNeighbors };
