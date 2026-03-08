"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZeroTrustAuditLogger = createZeroTrustAuditLogger;
class NoopAuditLogger {
    async log() {
        return undefined;
    }
}
function createZeroTrustAuditLogger() {
    return new NoopAuditLogger();
}
