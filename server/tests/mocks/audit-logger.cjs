// Mock for middleware/audit-logger
const auditLogger = (req, res, next) => {
  next();
};

const createAuditLogger = () => auditLogger;

const logAuditEvent = async (_event) => { };

module.exports = {
  auditLogger,
  createAuditLogger,
  logAuditEvent,
};
