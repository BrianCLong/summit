"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretAuditLogger = void 0;
class SecretAuditLogger {
    logPath;
    constructor(logPath) {
        this.logPath = logPath;
    }
    record(_event) { }
}
exports.SecretAuditLogger = SecretAuditLogger;
exports.default = SecretAuditLogger;
