const { getDb } = require('../config/database');

async function log_audit_event(
  user_id,
  action,
  resource_type,
  resource_id,
  details,
  ip_address,
  status
) {
  const db = getDb();
  await db.query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user_id, action, resource_type, resource_id, details, ip_address, status]
  );
}

module.exports = { log_audit_event };
