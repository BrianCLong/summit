const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');
const sanitize = require('../middleware/sanitize').default;

const {
  encodeCursor,
  decodeCursor,
  normalizeLimit,
  buildPageInfo,
} = require('../utils/cursorPagination');

const router = express.Router();

// Authn for all, RBAC for write, sanitize inputs
router.use(ensureAuthenticated);
router.use(sanitize);

async function logAudit(req, action, resourceId, details) {
  try {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        req.user.id,
        action,
        'Entity',
        resourceId,
        details ? JSON.stringify(details) : null,
        req.ip,
        req.headers['user-agent'] || null,
      ],
    );
  } catch (e) {
    // non-fatal
  }
}

router.get('/', async (req, res) => {
  const { type, q } = req.query;
  const defaultLimit = 50;
  const limit = normalizeLimit(req.query.limit, defaultLimit, 500);
  const cursor = decodeCursor(req.query.cursor, {
    offset: Number(req.query.skip ?? 0) || 0,
    limit,
  });
  const driver = getNeo4jDriver();
  const session = driver.session();

  const clauses = ['MATCH (e:Entity)'];
  const where = [];
  const params = { limit: cursor.limit, skip: cursor.offset };
  if (type) {
    where.push('e.type = $type');
    params.type = type;
  }
  if (q) {
    where.push(
      '(toLower(e.label) CONTAINS toLower($q) OR toLower(e.description) CONTAINS toLower($q))',
    );
    params.q = q;
  }
  if (where.length) clauses.push('WHERE ' + where.join(' AND '));
  clauses.push('RETURN e ORDER BY e.createdAt DESC SKIP $skip LIMIT $limit');
  const cypher = clauses.join('\n');

  const streamMode =
    req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

  if (streamMode) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let active = true;
    req.on('close', async () => {
      active = false;
      await session.close();
    });

    const sendBatch = async (offset) => {
      if (!active) return;
      const result = await session.run(cypher, { ...params, skip: offset });
      const items = result.records.map((r) => r.get('e').properties);
      const pageInfo = buildPageInfo(offset, params.limit, items.length);
      res.write(`data: ${JSON.stringify({ type: 'batch', items, pageInfo })}\n\n`);
      if (!pageInfo.hasMore || !active) {
        res.write(
          `data: ${JSON.stringify({ type: 'complete', pageInfo })}\n\n`,
        );
        res.end();
        active = false;
        await session.close();
        return;
      }
      setImmediate(() => sendBatch(offset + params.limit));
    };

    try {
      await logAudit(req, 'READ', 'EntityListStream', null, {
        type,
        q,
        limit: params.limit,
        cursor,
      });
      await sendBatch(params.skip);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
      res.end();
      await session.close();
    }
    return;
  }

  try {
    const result = await session.run(cypher, params);
    const entities = result.records.map((r) => r.get('e').properties);
    const pageInfo = buildPageInfo(params.skip, params.limit, entities.length);
    await logAudit(req, 'READ', 'EntityList', null, {
      type,
      q,
      limit: params.limit,
      cursor,
    });
    res.json({ items: entities, count: entities.length, pageInfo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (e:Entity {uuid: $id}) RETURN e LIMIT 1',
      { id },
    );
    if (result.records.length === 0)
      return res.status(404).json({ error: 'Not found' });
    const entity = result.records[0].get('e').properties;
    await logAudit(req, 'VIEW', id, null);
    res.json(entity);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

router.post('/', authorize('write_graph'), async (req, res) => {
  const {
    type = 'CUSTOM',
    label,
    description = '',
    properties = {},
    position,
  } = req.body || {};
  if (!label) return res.status(400).json({ error: 'label required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `CREATE (e:Entity {
        id: $id, uuid: $id, type: $type, label: $label, description: $description,
        properties: $properties, verified: false, source: 'manual', createdAt: datetime($now), updatedAt: datetime($now), position: $position
      }) RETURN e`,
      {
        id,
        type,
        label,
        description,
        properties,
        now,
        position: position || null,
      },
    );
    const entity = result.records[0].get('e').properties;
    await logAudit(req, 'CREATE', id, { type, label });
    res.status(201).json(entity);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

router.patch('/:id', authorize('write_graph'), async (req, res) => {
  const id = req.params.id;
  const { label, description, properties, position, verified } = req.body || {};
  const now = new Date().toISOString();
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (e:Entity {uuid: $id})
       SET e.label = coalesce($label, e.label),
           e.description = coalesce($description, e.description),
           e.properties = coalesce($properties, e.properties),
           e.position = coalesce($position, e.position),
           e.verified = coalesce($verified, e.verified),
           e.updatedAt = datetime($now)
       RETURN e`,
      { id, label, description, properties, position, verified, now },
    );
    if (result.records.length === 0)
      return res.status(404).json({ error: 'Not found' });
    const entity = result.records[0].get('e').properties;
    await logAudit(req, 'UPDATE', id, { label, description });
    res.json(entity);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

router.delete('/:id', authorize('write_graph'), async (req, res) => {
  const id = req.params.id;
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (e:Entity {uuid: $id}) DETACH DELETE e RETURN count(*) AS c',
      { id },
    );
    const c = result.records[0].get('c').toInt
      ? result.records[0].get('c').toInt()
      : result.records[0].get('c');
    if (c === 0) return res.status(404).json({ error: 'Not found' });
    await logAudit(req, 'DELETE', id, null);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
