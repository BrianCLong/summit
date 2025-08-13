const express = require('express');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { getPostgresPool } = require('../config/database');

const router = express.Router();
router.use(ensureAuthenticated);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
       FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/all', requireRole(['ADMIN']), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 2000);
    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

