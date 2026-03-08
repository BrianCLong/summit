"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const export_utils_js_1 = require("../api/export-utils.js");
const hash_utils_js_1 = require("../core/hash-utils.js");
function buildEvent(overrides = {}) {
    const base = {
        id: (0, crypto_1.randomUUID)(),
        eventType: 'user_login',
        level: 'info',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        version: '1.0.0',
        correlationId: (0, crypto_1.randomUUID)(),
        tenantId: 'tenant-1',
        serviceId: 'service-1',
        serviceName: 'Audit Service',
        environment: 'development',
        action: 'login',
        outcome: 'success',
        message: 'User logged in',
        details: {},
        complianceRelevant: false,
        complianceFrameworks: [],
    };
    return { ...base, ...overrides };
}
describe('export utils', () => {
    it('verifies a clean chain of events', () => {
        const first = buildEvent({ sequenceNumber: 1n });
        first.hash = (0, hash_utils_js_1.calculateEventHash)(first);
        first.previousEventHash = hash_utils_js_1.GENESIS_HASH;
        const second = buildEvent({
            id: (0, crypto_1.randomUUID)(),
            sequenceNumber: 2n,
            correlationId: first.correlationId,
        });
        second.hash = (0, hash_utils_js_1.calculateEventHash)(second);
        second.previousEventHash = (0, hash_utils_js_1.calculateChainHash)(first.hash, first.previousEventHash, 1n);
        const report = (0, export_utils_js_1.verifyChainForExport)([second, first]);
        expect(report.valid).toBe(true);
        expect(report.issues).toHaveLength(0);
        expect(report.startHash).toBe(hash_utils_js_1.GENESIS_HASH);
        expect(report.endHash).toBe((0, hash_utils_js_1.calculateChainHash)(second.hash, second.previousEventHash, 2n));
    });
    it('detects tampering in a modified log', () => {
        const event = buildEvent({ sequenceNumber: 1n });
        event.hash = (0, hash_utils_js_1.calculateEventHash)(event);
        event.previousEventHash = hash_utils_js_1.GENESIS_HASH;
        const tampered = { ...event, message: 'unexpected change' };
        tampered.hash = event.hash; // stale hash should fail verification
        const report = (0, export_utils_js_1.verifyChainForExport)([tampered]);
        expect(report.valid).toBe(false);
        expect(report.issues.some((issue) => issue.includes('Hash mismatch'))).toBe(true);
    });
    it('sanitizes PII fields before export', () => {
        const event = buildEvent({
            sequenceNumber: 1n,
            userName: 'Jane Analyst',
            userEmail: 'jane@example.com',
            ipAddress: '10.0.0.1',
            userAgent: 'jest-test',
            geolocation: { city: 'Denver' },
            deviceFingerprint: 'abc123',
            impersonatedBy: 'admin',
        });
        const sanitized = (0, export_utils_js_1.sanitizeEventForExport)(event);
        expect(sanitized.userName).toBeUndefined();
        expect(sanitized.userEmail).toBeUndefined();
        expect(sanitized.ipAddress).toBeUndefined();
        expect(sanitized.userAgent).toBeUndefined();
        expect(sanitized.geolocation).toBeUndefined();
        expect(sanitized.deviceFingerprint).toBeUndefined();
        expect(sanitized.impersonatedBy).toBeUndefined();
        expect(sanitized.redacted).toBe(true);
    });
    it('builds a manifest that reflects pagination inputs', () => {
        const first = buildEvent({ sequenceNumber: 1n });
        first.hash = (0, hash_utils_js_1.calculateEventHash)(first);
        first.previousEventHash = hash_utils_js_1.GENESIS_HASH;
        const manifest = (0, export_utils_js_1.buildManifest)([first], new Date('2024-01-01'), new Date('2024-01-02'), 2, 50, 120);
        expect(manifest.page).toBe(2);
        expect(manifest.pageSize).toBe(50);
        expect(manifest.totalEvents).toBe(120);
        expect(manifest.exportedEvents).toBe(1);
        expect(manifest.checksum).toHaveLength(64);
    });
});
