const { getPostgresPool, getNeo4jDriver } = require('../config/database');
const { getIO } = require('../realtime/socket');
const logger = require('../utils/logger');

// Default strategy: store in Neo4j for locality, mirror to PG for audit/search if table exists

async function addTag(entityId, tag, { user, traceId } = {}) {
  const neo = getNeo4jDriver();
  const pg = getPostgresPool();
  const session = neo.session();
  try {
    // Upsert tag on node property array `tags`
    const cypher = `
      MATCH (e:Entity {id: $entityId})
      WITH e, CASE WHEN e.tags IS NULL THEN [] ELSE e.tags END AS tags
      WITH e, CASE WHEN $tag IN tags THEN tags ELSE tags + $tag END AS newTags
      SET e.tags = newTags
      RETURN e { .id, .label, type: head(labels(e)), tags: e.tags } AS entity
    `;
    const res = await session.run(cypher, { entityId, tag });
    if (!res.records.length) {
      const err = new Error('Entity not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const entity = res.records[0].get('entity');

    // Mirror to PG if table exists
    try {
      await pg.query(
        `CREATE TABLE IF NOT EXISTS entity_tags (
          entity_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE (entity_id, tag)
        )`
      );
      await pg.query(
        'INSERT INTO entity_tags(entity_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [entityId, tag]
      );
      await pg.query(
        'INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [user?.id || null, 'TAG_ENTITY', 'Entity', entityId, { tag, traceId }]
      );
    } catch (e) {
      logger.warn('TagService PG mirror failed', { err: e.message });
    }

    // Emit optional graph update
    try {
      const io = getIO();
      if (io) io.of('/realtime').emit('graph:updated', { entityId, change: { type: 'tag_added', tag } });
    } catch (_) { /* Intentionally empty */ }

    return entity;
  } finally {
    await session.close();
  }
}

module.exports = { addTag };