"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditEntry = exports.ConsoleAuditLogger = exports.InMemoryAuditLogger = void 0;
class InMemoryAuditLogger {
    entries = [];
    record(entry) {
        this.entries.push(entry);
    }
    getAll() {
        return this.entries;
    }
}
exports.InMemoryAuditLogger = InMemoryAuditLogger;
class ConsoleAuditLogger {
    record(entry) {
        const serialized = JSON.stringify(entry);
        // eslint-disable-next-line no-console
        console.info(`[jira-audit] ${serialized}`);
    }
}
exports.ConsoleAuditLogger = ConsoleAuditLogger;
const createAuditEntry = (action, status, details = {}) => ({
    timestamp: new Date().toISOString(),
    action,
    status,
    ...details,
});
exports.createAuditEntry = createAuditEntry;
