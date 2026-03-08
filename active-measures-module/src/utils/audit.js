"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
function logAudit(actor, action, details) {
    // Similar to middleware, but for services
    const entry = {
        actor,
        action,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString(),
    };
    // Insert to DB (placeholder)
    console.log('Logging audit entry:', entry);
}
