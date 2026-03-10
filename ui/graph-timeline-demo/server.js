const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.DEMO_API_PORT || 8082;
const NEO4J_URI = process.env.NEO4J_DEMO_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASS = process.env.NEO4J_PASS || 'demo';

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASS)
);

function toJsInt(v) {
  if (neo4j.isInt(v)) return v.toNumber();
  return v;
}

app.get('/healthz', async (_req, res) => {
  try {
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    await session.run('RETURN 1 AS ok');
    await session.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Timeline endpoint
 * Returns items shaped for vis-timeline:
 * { id, content, start, end?, anomalyScore, uncertainty, group?, meta? }
 */
app.get('/api/demo/timeline', async (req, res) => {
  const limit = Number(req.query.limit || 250);
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  const cypher = `
    MATCH ()-[r]->()
    WHERE r.ts IS NOT NULL
    RETURN
      coalesce(r.id, elementId(r)) AS id,
      coalesce(r.label, type(r), 'event') AS content,
      r.ts AS start,
      r.endTs AS end,
      coalesce(r.anomalyScore, 0.0) AS anomalyScore,
      coalesce(r.uncertainty, 0.0) AS uncertainty,
      coalesce(r.group, type(r), 'events') AS group
    ORDER BY r.ts DESC
    LIMIT $limit
  `;

  try {
    const result = await session.run(cypher, { limit: neo4j.int(limit) });
    const items = result.records.map((rec) => ({
      id: rec.get('id'),
      content: rec.get('content'),
      start: rec.get('start'),
      end: rec.get('end') || undefined,
      anomalyScore: Number(toJsInt(rec.get('anomalyScore'))),
      uncertainty: Number(toJsInt(rec.get('uncertainty'))),
      group: rec.get('group')
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

/**
 * Bounded graph endpoint with aggregate fallback
 *
 * Query params:
 *   start=ISO date/time
 *   end=ISO date/time
 *   maxNodes=500
 *
 * Response:
 * {
 *   mode: "graph" | "aggregate",
 *   nodes: [...],
 *   edges: [...],
 *   meta: {...}
 * }
 */
app.get('/api/demo/graph', async (req, res) => {
  const start = req.query.start;
  const end = req.query.end;
  const maxNodes = Number(req.query.maxNodes || 500);

  if (!start || !end) {
    return res.status(400).json({ error: 'start and end are required' });
  }

  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  try {
    const countCypher = `
      MATCH (a)-[r]->(b)
      WHERE r.ts >= $start AND r.ts <= $end
      WITH collect(DISTINCT a) + collect(DISTINCT b) AS allNodes, count(r) AS relCount
      RETURN size(apoc.coll.toSet(allNodes)) AS nodeCount, relCount
    `;

    let nodeCount = null;
    let relCount = null;

    try {
      const countResult = await session.run(countCypher, { start, end });
      if (countResult.records.length) {
        nodeCount = toJsInt(countResult.records[0].get('nodeCount'));
        relCount = toJsInt(countResult.records[0].get('relCount'));
      }
    } catch {
      const fallbackCountCypher = `
        MATCH (a)-[r]->(b)
        WHERE r.ts >= $start AND r.ts <= $end
        RETURN count(DISTINCT a) + count(DISTINCT b) AS roughNodeCount, count(r) AS relCount
      `;
      const countResult = await session.run(fallbackCountCypher, { start, end });
      if (countResult.records.length) {
        nodeCount = toJsInt(countResult.records[0].get('roughNodeCount'));
        relCount = toJsInt(countResult.records[0].get('relCount'));
      }
    }

    if ((nodeCount || 0) > maxNodes) {
      const aggregateCypher = `
        MATCH (a)-[r]->(b)
        WHERE r.ts >= $start AND r.ts <= $end
        WITH
          labels(a)[0] AS srcLabel,
          type(r) AS relType,
          labels(b)[0] AS dstLabel,
          count(*) AS edgeCount,
          avg(coalesce(r.anomalyScore, 0.0)) AS avgAnomaly,
          avg(coalesce(r.uncertainty, 0.0)) AS avgUncertainty
        RETURN srcLabel, relType, dstLabel, edgeCount, avgAnomaly, avgUncertainty
        ORDER BY edgeCount DESC
        LIMIT 100
      `;

      const aggResult = await session.run(aggregateCypher, { start, end });
      const nodeMap = new Map();
      const edges = [];

      function ensureNode(label, kind) {
        const id = `${kind}:${label || 'Unknown'}`;
        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            label: label || 'Unknown',
            group: 'aggregate',
            kind,
            mass: 2,
            size: 30
          });
        }
        return id;
      }

      for (const rec of aggResult.records) {
        const srcLabel = rec.get('srcLabel') || 'Unknown';
        const relType = rec.get('relType') || 'RELATED_TO';
        const dstLabel = rec.get('dstLabel') || 'Unknown';
        const edgeCount = toJsInt(rec.get('edgeCount'));
        const avgAnomaly = Number(rec.get('avgAnomaly'));
        const avgUncertainty = Number(rec.get('avgUncertainty'));

        const from = ensureNode(srcLabel, 'src');
        const to = ensureNode(dstLabel, 'dst');

        edges.push({
          id: `${from}-${relType}-${to}`,
          from,
          to,
          label: `${relType} × ${edgeCount}`,
          width: Math.max(1, Math.min(10, Math.log2(edgeCount + 1))),
          anomalyScore: avgAnomaly,
          uncertainty: avgUncertainty,
          count: edgeCount
        });
      }

      return res.json({
        mode: 'aggregate',
        nodes: Array.from(nodeMap.values()),
        edges,
        meta: {
          nodeCount,
          relCount,
          maxNodes,
          reason: 'node_cap_exceeded'
        }
      });
    }

    const graphCypher = `
      MATCH (a)-[r]->(b)
      WHERE r.ts >= $start AND r.ts <= $end
      RETURN a, r, b
      LIMIT 1000
    `;

    const graphResult = await session.run(graphCypher, { start, end });
    const nodeMap = new Map();
    const edges = [];

    for (const rec of graphResult.records) {
      const a = rec.get('a');
      const b = rec.get('b');
      const r = rec.get('r');

      const aId = a.elementId || a.identity.toString();
      const bId = b.elementId || b.identity.toString();
      const rId = r.elementId || r.identity.toString();

      if (!nodeMap.has(aId)) {
        nodeMap.set(aId, {
          id: aId,
          label: a.properties.name || a.properties.id || a.labels[0] || aId,
          group: a.labels[0] || 'Node',
          uncertainty: Number(toJsInt(a.properties.uncertainty || 0))
        });
      }
      if (!nodeMap.has(bId)) {
        nodeMap.set(bId, {
          id: bId,
          label: b.properties.name || b.properties.id || b.labels[0] || bId,
          group: b.labels[0] || 'Node',
          uncertainty: Number(toJsInt(b.properties.uncertainty || 0))
        });
      }

      edges.push({
        id: rId,
        from: aId,
        to: bId,
        label: r.type,
        uncertainty: Number(toJsInt(r.properties.uncertainty || 0)),
        anomalyScore: Number(toJsInt(r.properties.anomalyScore || 0))
      });
    }

    res.json({
      mode: 'graph',
      nodes: Array.from(nodeMap.values()),
      edges,
      meta: { nodeCount: nodeMap.size, relCount: edges.length, maxNodes }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

process.on('SIGINT', async () => {
  await driver.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`demo api listening on :${PORT}`);
});
