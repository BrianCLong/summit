"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretVault = void 0;
const crypto_1 = require("crypto");
class SecretVault {
    secrets = new Map();
    auditTrail = [];
    setSecret(connectorId, key, value) {
        const record = {
            id: (0, crypto_1.randomUUID)(),
            connectorId,
            key,
            value,
            version: 1,
            createdAt: Date.now()
        };
        this.secrets.set(connectorId, [record]);
        this.auditTrail.push({ id: (0, crypto_1.randomUUID)(), action: 'set', connectorId, timestamp: Date.now() });
        return record;
    }
    rotateSecret(connectorId, key, value) {
        const existing = this.secrets.get(connectorId) ?? [];
        const version = (existing.at(-1)?.version ?? 0) + 1;
        const record = {
            id: (0, crypto_1.randomUUID)(),
            connectorId,
            key,
            value,
            version,
            createdAt: existing.at(-1)?.createdAt ?? Date.now(),
            rotatedAt: Date.now()
        };
        this.secrets.set(connectorId, [...existing, record]);
        this.auditTrail.push({ id: (0, crypto_1.randomUUID)(), action: 'rotate', connectorId, timestamp: Date.now() });
        return record;
    }
    getSecret(connectorId, key) {
        const records = this.secrets.get(connectorId) ?? [];
        return [...records].reverse().find((record) => record.key === key);
    }
    audit() {
        return [...this.auditTrail];
    }
}
exports.SecretVault = SecretVault;
