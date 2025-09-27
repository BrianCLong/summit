const { getPostgresPool } = require('../config/database');

async function writeAudit({ userId, action, resourceType, resourceId, details, ip, userAgent }) {
  try {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)` ,
      [userId || null, action, resourceType || null, resourceId || null, details || null, ip || null, userAgent || null]
    );
  } catch (_) { /* non-fatal */ }
}

module.exports = { writeAudit };

