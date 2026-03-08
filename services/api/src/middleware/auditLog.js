"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
exports.getAuditEvents = getAuditEvents;
const events = [];
function auditLog(req, action, details) {
    events.push({
        ts: new Date().toISOString(),
        user: req.user,
        action,
        details,
        ip: req.ip,
    });
    if (events.length > 1000)
        events.shift();
}
function getAuditEvents(limit = 200) {
    return events.slice(-limit).reverse();
}
