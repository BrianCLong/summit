"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersioningService = void 0;
const crypto_1 = require("crypto");
class VersioningService {
    versions = new Map();
    recordVersion(record, actor) {
        const history = this.versions.get(record.id.id) ?? [];
        const previous = history[history.length - 1];
        const checksum = this.computeChecksum(record.data);
        const diff = previous ? this.computeDiff(previous.data, record.data) : undefined;
        const version = {
            version: history.length + 1,
            recordId: record.id.id,
            recordType: record.metadata.recordType ?? 'unknown',
            tenantId: record.metadata.tenantId ?? 'unknown',
            data: record.data,
            checksum,
            timestamp: new Date(),
            actor,
            diff,
        };
        this.versions.set(record.id.id, [...history, version]);
        return version;
    }
    getVersions(recordId) {
        return this.versions.get(recordId) ?? [];
    }
    latestChecksum(recordId) {
        const versions = this.getVersions(recordId);
        return versions[versions.length - 1]?.checksum;
    }
    verifyCurrentData(recordId, data) {
        const latest = this.latestChecksum(recordId);
        if (!latest)
            return true;
        return latest === this.computeChecksum(data);
    }
    computeChecksum(data) {
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
    computeDiff(previous, current) {
        const diff = {};
        const fields = new Set([...Object.keys(previous), ...Object.keys(current)]);
        fields.forEach(field => {
            const before = previous[field];
            const after = current[field];
            if (JSON.stringify(before) !== JSON.stringify(after)) {
                diff[field] = { previous: before, current: after };
            }
        });
        return diff;
    }
}
exports.VersioningService = VersioningService;
