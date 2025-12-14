const express = require('express');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { getPostgresPool } = require('../config/database');
const {
  decodeCursor,
  encodeCursor,
  normalizeLimit,
  buildPageInfo,
} = require('../utils/cursorPagination');

const router = express.Router();
router.use(ensureAuthenticated);

router.get('/', async (req, res) => {
  try {
    const limit = normalizeLimit(
      req.query.pageSize || req.query.limit || '50',
      50,
      500,
    );
    const cursor = decodeCursor(req.query.cursor, {
      offset: Math.max(parseInt(req.query.page || '0', 10), 0) * limit,
      limit,
    });
    const action = (req.query.action || '').trim();
    const resource = (req.query.resource || '').trim();
    const pool = getPostgresPool();
    const where = ['user_id = $1'];
    const params = [req.user.id];
    if (action) {
      where.push('action ILIKE $' + (params.length + 1));
      params.push(`%${action}%`);
    }
    if (resource) {
      where.push(
        '(resource_type ILIKE $' +
          (params.length + 1) +
          ' OR resource_id ILIKE $' +
          (params.length + 2) +
          ')',
      );
      params.push(`%${resource}%`, `%${resource}%`);
    }
    const whereSql = where.join(' AND ');
    const listSql = `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
                     FROM audit_logs WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countSql = `SELECT COUNT(*)::int AS c FROM audit_logs WHERE ${whereSql}`;
    const streamMode =
      req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    if (streamMode) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let offset = cursor.offset;
      let active = true;

      req.on('close', () => {
        active = false;
      });

      const pump = async () => {
        if (!active) return;
        const listRes = await pool.query(listSql, [...params, limit, offset]);
        const pageInfo = buildPageInfo(offset, limit, listRes.rows.length);
        res.write(
          `data: ${JSON.stringify({
            type: 'batch',
            items: listRes.rows,
            pageInfo,
          })}\n\n`,
        );

        if (!pageInfo.hasMore || !active) {
          res.write(`data: ${JSON.stringify({ type: 'complete', pageInfo })}\n\n`);
          res.end();
          return;
        }
        offset += limit;
        setImmediate(pump);
      };

      await pump();
      return;
    }

    const listRes = await pool.query(listSql, [...params, cursor.limit, cursor.offset]);
    const countRes = await pool.query(countSql, params);
    const pageInfo = {
      ...buildPageInfo(cursor.offset, cursor.limit, listRes.rows.length),
      total: countRes.rows[0].c,
    };
    res.json({
      items: listRes.rows,
      total: countRes.rows[0].c,
      page: Math.floor(cursor.offset / cursor.limit),
      pageSize: cursor.limit,
      pageInfo,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    const limit = normalizeLimit(
      req.query.pageSize || req.query.limit || '100',
      100,
      1000,
    );
    const cursor = decodeCursor(req.query.cursor, {
      offset: Math.max(parseInt(req.query.page || '0', 10), 0) * limit,
      limit,
    });
    const action = (req.query.action || '').trim();
    const resource = (req.query.resource || '').trim();
    const pool = getPostgresPool();
    const where = [];
    const params = [];
    let paramIndex = 1;
    if (action) {
      where.push(`action ILIKE $${paramIndex++}`);
      params.push(`%${action}%`);
    }
    if (resource) {
      where.push(
        `(resource_type ILIKE $${paramIndex++} OR resource_id ILIKE $${paramIndex++})`,
      );
      params.push(`%${resource}%`, `%${resource}%`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const listSql = `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
                     FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    const countSql = `SELECT COUNT(*)::int AS c FROM audit_logs ${whereSql}`;
    const streamMode =
      req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    if (streamMode) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let offset = cursor.offset;
      let active = true;

      req.on('close', () => {
        active = false;
      });

      const pump = async () => {
        if (!active) return;
        const listRes = await pool.query(listSql, [...params, limit, offset]);
        const pageInfo = buildPageInfo(offset, limit, listRes.rows.length);
        res.write(
          `data: ${JSON.stringify({ type: 'batch', items: listRes.rows, pageInfo })}\n\n`,
        );

        if (!pageInfo.hasMore || !active) {
          res.write(`data: ${JSON.stringify({ type: 'complete', pageInfo })}\n\n`);
          res.end();
          return;
        }
        offset += limit;
        setImmediate(pump);
      };

      await pump();
      return;
    }

    const listRes = await pool.query(listSql, [...params, cursor.limit, cursor.offset]);
    const countRes = await pool.query(countSql, params);
    const pageInfo = {
      ...buildPageInfo(cursor.offset, cursor.limit, listRes.rows.length),
      total: countRes.rows[0].c,
    };
    res.json({
      items: listRes.rows,
      total: countRes.rows[0].c,
      page: Math.floor(cursor.offset / cursor.limit),
      pageSize: cursor.limit,
      pageInfo,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
