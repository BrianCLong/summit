const express = require('express');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const crypto = require('crypto');
const stream = require('stream');
const { getNeo4jDriver } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.use(ensureAuthenticated);

function addFilterClauses({ investigationId, entityType, tags, startDate, endDate }) {
  const where = [];
  const params = {};
  if (investigationId) { where.push('e.investigation_id = $investigationId'); params.investigationId = investigationId; }
  if (entityType) { where.push('e.type = $entityType'); params.entityType = entityType; }
  if (Array.isArray(tags) && tags.length) { where.push('ANY(t IN $tags WHERE t IN e.tags)'); params.tags = tags; }
  if (startDate) { where.push('e.created_at >= datetime($startDate)'); params.startDate = startDate; }
  if (endDate) { where.push('e.created_at <= datetime($endDate)'); params.endDate = endDate; }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function streamGraph({ investigationId, entityType, tags, startDate, endDate, writableStream, format }) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const { where, params } = addFilterClauses({ investigationId, entityType, tags, startDate, endDate });
    
    if (format === 'json') {
      writableStream.write('{"nodes":[');
      const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
      const nodesResult = await session.run(nodesQuery, params);
      for (let i = 0; i < nodesResult.records.length; i++) {
        writableStream.write(JSON.stringify(nodesResult.records[i].get('e').properties));
        if (i < nodesResult.records.length - 1) {
          writableStream.write(',');
        }
      }
      writableStream.write('],"edges":[');
      const edgeWhere = where.replace(/e\./g, 'a.');
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + ' AND b.investigation_id = a.investigation_id' : ''} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      for (let i = 0; i < edgesResult.records.length; i++) {
        const r = edgesResult.records[i].get('r');
        const a = edgesResult.records[i].get('a');
        const b = edgesResult.records[i].get('b');
        const edge = {
          id: r.properties?.id || r.identity?.toString?.() || undefined,
          uuid: r.properties?.uuid,
          type: r.type || r.properties?.type,
          label: r.properties?.label,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {},
        };
        writableStream.write(JSON.stringify(edge));
        if (i < edgesResult.records.length - 1) {
          writableStream.write(',');
        }
      }
      writableStream.write(']}');
    } else if (format === 'csv') {
      const nodeParser = new Parser({ fields: ['uuid','type','label','description','properties'], header: true });
      const edgeParser = new Parser({ fields: ['uuid','type','label','source','target','properties'], header: true });
      writableStream.write('# Nodes\n');
      const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
      const nodesResult = await session.run(nodesQuery, params);
      const nodes = nodesResult.records.map(rec => rec.get('e').properties);
      writableStream.write(nodeParser.parse(nodes.map(n => ({...n, properties: JSON.stringify(n.properties || {})}))) + '\n\n');
      writableStream.write('# Edges\n');
      const edgeWhere = where.replace(/e\./g, 'a.');
      const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + ' AND b.investigation_id = a.investigation_id' : ''} RETURN a,r,b`;
      const edgesResult = await session.run(edgesQuery, params);
      const edges = edgesResult.records.map(rec => {
        const r = rec.get('r');
        const a = rec.get('a');
        const b = rec.get('b');
        return {
          id: r.properties?.id || r.identity?.toString?.() || undefined,
          uuid: r.properties?.uuid,
          type: r.type || r.properties?.type,
          label: r.properties?.label,
          source: a.properties?.uuid,
          target: b.properties?.uuid,
          properties: r.properties || {},
        };
      });
      writableStream.write(edgeParser.parse(edges.map(e => ({...e, properties: JSON.stringify(e.properties || {})}))) + '\n');
    }
    writableStream.end();
  } finally {
    await session.close();
  }
}

router.get('/graph', async (req, res) => {
  try {
    const { format = 'json', investigationId, entityType, tags, startDate, endDate, encrypt, password } = req.query;
    const tagList = typeof tags === 'string' && tags.length ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    const { writeAudit } = require('../utils/audit');
    await writeAudit({
      userId: req.user?.id,
      action: 'EXPORT_GRAPH',
      resourceType: 'Graph',
      resourceId: investigationId || null,
      details: { format, entityType, tags: tagList, startDate, endDate, encrypt: !!encrypt },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      actorRole: req.user?.role,
      sessionId: req.sessionId,
    });

    if (format === 'json') {
      res.set('Content-Type', 'application/json');
      const passThrough = new stream.PassThrough();
      passThrough.pipe(res);
      streamGraph({ investigationId, entityType, tags: tagList, startDate, endDate, writableStream: passThrough, format });
    } else if (format === 'csv') {
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="graph_export.csv"');
      const passThrough = new stream.PassThrough();
      passThrough.pipe(res);
      streamGraph({ investigationId, entityType, tags: tagList, startDate, endDate, writableStream: passThrough, format });
    } else {
      return res.status(400).json({ error: 'Unsupported format for streaming. Use json or csv.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
