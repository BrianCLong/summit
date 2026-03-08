"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionRegistry = void 0;
class ExceptionRegistry {
    exceptions = new Map();
    add(entry) {
        const exception = { ...entry, createdAt: new Date(), status: 'active' };
        this.exceptions.set(entry.id, exception);
        return exception;
    }
    expiringWithin(days, now = new Date()) {
        const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return Array.from(this.exceptions.values()).filter(entry => entry.expiresAt <= threshold && entry.status === 'active');
    }
    refreshStatuses(now = new Date()) {
        for (const entry of this.exceptions.values()) {
            if (entry.status === 'active' && entry.expiresAt <= now) {
                entry.status = 'expired';
            }
        }
    }
    list() {
        return Array.from(this.exceptions.values());
    }
}
exports.ExceptionRegistry = ExceptionRegistry;
