"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
class AuditLogger {
    async log(event) {
        // In a real implementation, this would write to a structured log or database.
        // For now, we log to stdout in JSON format.
        console.log(JSON.stringify({
            level: 'info',
            component: 'mcp-gateway',
            event
        }));
    }
}
exports.AuditLogger = AuditLogger;
