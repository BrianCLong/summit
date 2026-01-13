// Mock for middleware/audit-logger
const auditLogger = (req, res, next) => {
  next();
};

const createAuditLogger = () => auditLogger;

const logAuditEvent = async (_event) => {};

// ESM-compatible exports
module.exports = auditLogger;
module.exports.auditLogger = auditLogger;
module.exports.createAuditLogger = createAuditLogger;
module.exports.logAuditEvent = logAuditEvent;
module.exports.default = auditLogger;
