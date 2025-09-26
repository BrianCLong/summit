const { getNeo4jDriver } = require('../config/database');
const neo4j = require('neo4j-driver');
const { randomUUID } = require('crypto');
import logger from '../utils/logger.js';

function sanitizeProperties(props = {}) {
  const entries = Object.entries(props || {}).filter(
    ([key, value]) =>
      value !== undefined &&
      value !== null &&
      !['id', 'tenantId', 'type', 'label', 'tags', 'investigationId'].includes(key),
  );
  return Object.fromEntries(entries);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return null;
  }
  const unique = [...new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim().length))];
  return unique.length ? unique : [];
}

async function expandNeighbors(entityId, limit = 50, { traceId } = {}) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  const start = Date.now();
  try {
    const cypher = `
      MATCH (n:Entity {id: $entityId})-[r]-(m:Entity)
      WITH DISTINCT m, r LIMIT $limit
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
    const cypher = `
      MATCH (n:Entity {id: $entityId, tenantId: $tenantId, investigationId: $investigationId})
      MATCH p = (n)-[r:RELATIONSHIP*1..$radius]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
      WITH collect(DISTINCT m) AS mNodes, collect(DISTINCT r) AS rels
      RETURN
        [node IN mNodes | {id: node.id, label: coalesce(node.label, node.id), type: head(labels(node)), tags: coalesce(node.tags, [])}] AS nodes,
        [rel IN rels | {id: toString(id(rel)), source: startNode(rel).id, target: endNode(rel).id, type: type(rel), label: rel.label}] AS edges
    `;
    const res = await session.run(cypher, {
      entityId,
      radius: Number(radius),
      tenantId,
      investigationId,
    });
    const rec = res.records[0];
    const nodes = rec ? rec.get('nodes') : [];
    const edges = rec ? rec.get('edges') : [];
    const ms = Date.now() - start;
    logger.info('expandNeighborhood', { entityId, radius, investigationId, tenantId, ms, traceId });
    return { nodes, edges };
  } finally {
    await session.close();
  }
}

async function applyBatchOperations(operations, { traceId } = {}) {
  const driver = getNeo4jDriver();
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  const tx = session.beginTransaction();

  const summary = {
    nodesCreated: 0,
    nodesUpdated: 0,
    edgesCreated: 0,
    edgesUpdated: 0,
    nodesDeleted: 0,
    edgesDeleted: 0,
  };

  const createNodes = (operations.createNodes || []).map((node) => ({
    id: node.id,
    tenantId: node.tenantId,
    type: node.type,
    label: node.label,
    investigationId: node.investigationId ?? null,
    tags: normalizeTags(node.tags),
    properties: sanitizeProperties(node.properties),
  }));

  const createEdges = (operations.createEdges || []).map((edge) => ({
    id: edge.id || randomUUID(),
    tenantId: edge.tenantId,
    type: edge.type,
    label: edge.label ?? null,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    investigationId: edge.investigationId ?? null,
    properties: sanitizeProperties(edge.properties),
  }));

  const deleteNodes = (operations.deleteNodes || []).map((node) => ({
    id: node.id,
    tenantId: node.tenantId,
  }));

  const deleteEdges = (operations.deleteEdges || []).map((edge) => ({
    id: edge.id,
    tenantId: edge.tenantId,
  }));

  try {
    if (createNodes.length) {
      const result = await tx.run(
        `
          UNWIND $nodes AS node
          MERGE (n:Entity {id: node.id, tenantId: node.tenantId})
          ON CREATE SET
            n.type = node.type,
            n.label = node.label,
            n.investigationId = node.investigationId,
            n.tags = coalesce(node.tags, []),
            n.createdAt = datetime()
          ON MATCH SET
            n.type = coalesce(node.type, n.type),
            n.label = coalesce(node.label, n.label),
            n.investigationId = coalesce(node.investigationId, n.investigationId),
            n.tags = CASE WHEN node.tags IS NULL THEN n.tags ELSE node.tags END
          SET
            n.updatedAt = datetime(),
            n += node.properties
        `,
        { nodes: createNodes },
      );
      const counters = result.summary.counters;
      const created = counters.nodesCreated();
      summary.nodesCreated += created;
      summary.nodesUpdated += createNodes.length - created;
    }

    if (createEdges.length) {
      const result = await tx.run(
        `
          UNWIND $edges AS edge
          MATCH (source:Entity {id: edge.sourceId, tenantId: edge.tenantId})
          MATCH (target:Entity {id: edge.targetId, tenantId: edge.tenantId})
          MERGE (source)-[rel:RELATIONSHIP {id: edge.id}]->(target)
          ON CREATE SET
            rel.type = edge.type,
            rel.label = edge.label,
            rel.tenantId = edge.tenantId,
            rel.investigationId = edge.investigationId,
            rel.createdAt = datetime()
          ON MATCH SET
            rel.type = coalesce(edge.type, rel.type),
            rel.label = coalesce(edge.label, rel.label),
            rel.investigationId = coalesce(edge.investigationId, rel.investigationId)
          SET
            rel.updatedAt = datetime(),
            rel += edge.properties
        `,
        { edges: createEdges },
      );
      const counters = result.summary.counters;
      const created = counters.relationshipsCreated();
      summary.edgesCreated += created;
      summary.edgesUpdated += createEdges.length - created;
    }

    if (deleteNodes.length) {
      const result = await tx.run(
        `
          UNWIND $nodes AS node
          MATCH (n:Entity {id: node.id, tenantId: node.tenantId})
          DETACH DELETE n
        `,
        { nodes: deleteNodes },
      );
      const counters = result.summary.counters;
      summary.nodesDeleted += counters.nodesDeleted();
      summary.edgesDeleted += counters.relationshipsDeleted();
    }

    if (deleteEdges.length) {
      const result = await tx.run(
        `
          UNWIND $edges AS edge
          MATCH ()-[rel:RELATIONSHIP {id: edge.id, tenantId: edge.tenantId}]-()
          DELETE rel
        `,
        { edges: deleteEdges },
      );
      const counters = result.summary.counters;
      summary.edgesDeleted += counters.relationshipsDeleted();
    }

    await tx.commit();
    logger.info('applyBatchOperations success', {
      traceId,
      nodesCreated: summary.nodesCreated,
      nodesUpdated: summary.nodesUpdated,
      edgesCreated: summary.edgesCreated,
      edgesUpdated: summary.edgesUpdated,
      nodesDeleted: summary.nodesDeleted,
      edgesDeleted: summary.edgesDeleted,
    });
    return summary;
  } catch (error) {
    await tx.rollback();
    logger.error('applyBatchOperations failed', { traceId, err: error });
    throw error;
  } finally {
    await session.close();
  }
}

module.exports = { expandNeighbors, expandNeighborhood, applyBatchOperations };
