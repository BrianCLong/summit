"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeExportParamsHash = computeExportParamsHash;
exports.buildExportKey = buildExportKey;
exports.deriveIdempotencyKey = deriveIdempotencyKey;
exports.sanitizeFilename = sanitizeFilename;
exports.resolveJobKey = resolveJobKey;
function stableSortObject(value) {
    if (Array.isArray(value)) {
        return value.map((item) => stableSortObject(item));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = stableSortObject(value[key]);
            return acc;
        }, {});
    }
    return value;
}
function hashString(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
function computeExportParamsHash(params) {
    const normalized = stableSortObject(params);
    const serialized = JSON.stringify(normalized);
    return hashString(serialized);
}
function buildExportKey(tenantId, caseId, paramsHash) {
    return `${tenantId}::${caseId}::${paramsHash}`;
}
function deriveIdempotencyKey(tenantId, caseId, paramsHash, salt) {
    const base = `${tenantId}-${caseId}-${paramsHash}`;
    if (!salt)
        return base;
    return `${base}-${salt}`;
}
function sanitizeFilename(base, format) {
    const safeBase = base.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_{2,}/g, '_');
    return `${safeBase}.${format === 'pdf' ? 'pdf' : 'zip'}`;
}
function resolveJobKey(tenantId, caseId, paramsHash) {
    return buildExportKey(tenantId, caseId, paramsHash);
}
