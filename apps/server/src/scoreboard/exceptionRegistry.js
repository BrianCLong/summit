"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionRegistry = void 0;
const crypto_1 = require("crypto");
class ExceptionRegistry {
    entries = [];
    registerException(params) {
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            domainId: params.domainId,
            gate: params.gate,
            owner: params.owner,
            reason: params.reason,
            expiresAt: params.expiresAt,
            createdAt: new Date().toISOString(),
        };
        this.entries.push(entry);
        this.pruneExpired();
        return entry;
    }
    getActive(domainId, gate) {
        this.pruneExpired();
        return this.entries.find((entry) => entry.domainId === domainId &&
            entry.gate === gate &&
            new Date(entry.expiresAt).getTime() > Date.now());
    }
    listByDomain(domainId) {
        this.pruneExpired();
        return this.entries.filter((entry) => entry.domainId === domainId);
    }
    pruneExpired() {
        const now = Date.now();
        this.entries = this.entries.filter((entry) => new Date(entry.expiresAt).getTime() > now);
    }
}
exports.ExceptionRegistry = ExceptionRegistry;
