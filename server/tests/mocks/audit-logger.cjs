const auditLogger = (req, res, next) => {
  next();
};

const createAuditLogger = () => auditLogger;

const logAuditEvent = async (_event) => { };

module.exports.auditLogger = auditLogger;
module.exports.createAuditLogger = createAuditLogger;
module.exports.logAuditEvent = logAuditEvent;
module.exports.default = {
  auditLogger,
  createAuditLogger,
  logAuditEvent,
};.exports.auditLogger = auditLogger;
module.exports.createAuditLogger = createAuditLogger;
module.exports.logAuditEvent = logAuditEvent;
module.exports.default = auditLogger;
