"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionLog = void 0;
const crypto_1 = require("crypto");
class DecisionLog {
    entries = [];
    log(entry) {
        const record = {
            ...entry,
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date().toISOString(),
        };
        this.entries.push(record);
        return record;
    }
    list(domainId) {
        if (!domainId)
            return [...this.entries];
        return this.entries.filter((entry) => entry.domainId === domainId);
    }
}
exports.DecisionLog = DecisionLog;
