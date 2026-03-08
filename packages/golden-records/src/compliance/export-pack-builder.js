"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportPackBuilder = void 0;
const crypto_1 = require("crypto");
class ExportPackBuilder {
    build(records, auditTrail, versions, context) {
        const recordHash = this.hashPayload(records);
        const auditTrailHash = this.hashPayload(auditTrail);
        const versionHash = this.hashPayload(versions);
        const manifest = {
            exportedBy: context.requestedBy,
            exportedAt: new Date(),
            recordType: context.recordType,
            tenantId: context.tenantId,
            recordIds: context.recordIds,
            auditTrailHash,
            versionHash,
            recordHash,
        };
        const packHash = this.hashPayload({ manifest, recordHash, auditTrailHash, versionHash });
        return {
            manifest,
            records,
            auditTrail,
            versions,
            packHash,
        };
    }
    hashPayload(payload) {
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(payload)).digest('hex');
    }
}
exports.ExportPackBuilder = ExportPackBuilder;
