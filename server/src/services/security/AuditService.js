"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const audit_js_1 = require("../../utils/audit.js");
class AuditService {
    /**
     * Logs a security or operational event to the audit trail.
     */
    static async log(event) {
        return (0, audit_js_1.writeAudit)(event);
    }
}
exports.AuditService = AuditService;
