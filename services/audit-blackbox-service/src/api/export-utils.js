"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeEventForExport = sanitizeEventForExport;
exports.verifyChainForExport = verifyChainForExport;
exports.buildManifest = buildManifest;
exports.buildSchemaSummary = buildSchemaSummary;
// @ts-nocheck
const crypto_1 = require("crypto");
const types_js_1 = require("../core/types.js");
const hash_utils_js_1 = require("../core/hash-utils.js");
const PII_FIELDS = [
    'userName',
    'userEmail',
    'ipAddress',
    'ipAddressV6',
    'userAgent',
    'geolocation',
    'deviceFingerprint',
    'impersonatedBy',
];
function sanitizeEventForExport(event) {
    const clone = { ...event, redacted: true };
    for (const field of PII_FIELDS) {
        delete clone[field];
    }
    return clone;
}
function verifyChainForExport(events) {
    if (events.length === 0) {
        return {
            valid: true,
            issues: [],
            startHash: hash_utils_js_1.GENESIS_HASH,
            endHash: hash_utils_js_1.GENESIS_HASH,
            verifiedAt: new Date().toISOString(),
        };
    }
    const sorted = [...events].sort((a, b) => {
        const seqA = a.sequenceNumber ?? 0n;
        const seqB = b.sequenceNumber ?? 0n;
        if (seqA !== seqB)
            return seqA < seqB ? -1 : 1;
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
    });
    const issues = [];
    let startHash = sorted[0].previousEventHash || hash_utils_js_1.GENESIS_HASH;
    let expectedPreviousHash = startHash;
    let expectedSequence = sorted[0].sequenceNumber ?? 1n;
    let endHash = startHash;
    for (const event of sorted) {
        if (event.sequenceNumber === undefined) {
            issues.push(`Event ${event.id} is missing a sequence number`);
            continue;
        }
        if (event.sequenceNumber !== expectedSequence) {
            issues.push(`Sequence gap detected: expected ${expectedSequence}, found ${event.sequenceNumber}`);
            expectedSequence = event.sequenceNumber;
        }
        const computedEventHash = (0, hash_utils_js_1.calculateEventHash)(event);
        if (event.hash && event.hash !== computedEventHash) {
            issues.push(`Hash mismatch for event ${event.id}`);
        }
        if (event.previousEventHash &&
            event.previousEventHash !== expectedPreviousHash) {
            issues.push(`Previous hash mismatch at ${event.id}: expected ${expectedPreviousHash}, received ${event.previousEventHash}`);
        }
        const chainHash = (0, hash_utils_js_1.calculateChainHash)(event.hash || computedEventHash, expectedPreviousHash, event.sequenceNumber);
        expectedPreviousHash = chainHash;
        endHash = chainHash;
        expectedSequence += 1n;
    }
    return {
        valid: issues.length === 0,
        issues,
        startHash,
        endHash,
        verifiedAt: new Date().toISOString(),
    };
}
function buildManifest(events, from, to, page, pageSize, totalEvents) {
    const checksum = (0, crypto_1.createHash)('sha256')
        .update(JSON.stringify(events, (_key, value) => typeof value === 'bigint' ? value.toString() : value))
        .digest('hex');
    return {
        id: `audit-export-${from.toISOString()}-${to.toISOString()}-${page}`,
        generatedAt: new Date().toISOString(),
        range: { from: from.toISOString(), to: to.toISOString() },
        page,
        pageSize,
        totalEvents,
        exportedEvents: events.length,
        checksum,
    };
}
function buildSchemaSummary() {
    const fields = Object.keys(types_js_1.AuditEventSchema.shape);
    return {
        version: '1.0.0',
        fields,
    };
}
