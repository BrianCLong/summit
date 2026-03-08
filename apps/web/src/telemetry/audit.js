"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAudit = recordAudit;
function recordAudit(action, details) {
    try {
        console.info('[audit]', action, details);
    }
    catch (error) {
        console.error('Audit logging failed', error);
    }
}
