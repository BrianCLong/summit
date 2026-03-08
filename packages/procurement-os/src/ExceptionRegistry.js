"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionRegistry = void 0;
const date_fns_1 = require("date-fns");
class ExceptionRegistry {
    exceptions = new Map();
    register(entry) {
        this.exceptions.set(entry.id, entry);
    }
    isValid(exceptionId, at = new Date()) {
        const entry = this.exceptions.get(exceptionId);
        if (!entry) {
            return false;
        }
        return (0, date_fns_1.isAfter)(entry.expiresAt, at);
    }
    expiringWithin(days, at = new Date()) {
        const deadline = new Date(at.getTime() + days * 24 * 60 * 60 * 1000);
        return Array.from(this.exceptions.values()).filter((entry) => entry.expiresAt <= deadline);
    }
}
exports.ExceptionRegistry = ExceptionRegistry;
