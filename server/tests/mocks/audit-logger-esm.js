export const auditLogger = (req, res, next) => {
    next();
};

export const createAuditLogger = () => auditLogger;

export const logAuditEvent = async () => { };

export default {
    auditLogger,
    createAuditLogger,
    logAuditEvent,
};
