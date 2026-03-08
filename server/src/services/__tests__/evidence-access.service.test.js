"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const evidence_access_service_js_1 = require("../evidence-access.service.js");
const baseEvidence = {
    id: 'ev-1',
    storage_uri: 's3://evidence-bucket/runs/run-1/artifact.log',
    collected_at: new Date('2024-01-01T00:00:00Z'),
    metadata: {
        caseId: 'case-1',
        tenantId: 'tenant-1',
    },
};
(0, globals_1.describe)('EvidenceAccessService signed URLs', () => {
    const auditLogger = { recordEvent: globals_1.jest.fn().mockResolvedValue('audit-1') };
    (0, globals_1.beforeEach)(() => {
        auditLogger.recordEvent.mockClear();
    });
    test('generates scoped signed URLs that validate', async () => {
        const service = new evidence_access_service_js_1.EvidenceAccessService({
            enableSignedUrls: true,
            enableTiered: false,
            signingKey: 'unit-test-key',
            signedUrlTtlSeconds: 60,
            auditLogger,
        });
        const access = await service.getAccessDescriptor(baseEvidence, {
            tenantId: 'tenant-1',
            caseId: 'case-1',
            derivativeType: 'thumbnail',
            now: new Date('2024-01-01T00:00:00Z'),
        });
        const validation = service.validateSignedToken(access.token, 'tenant-1', 'case-1', new Date('2024-01-01T00:00:30Z'));
        (0, globals_1.expect)(validation.valid).toBe(true);
        (0, globals_1.expect)(validation.payload?.derivativeType).toBe('thumbnail');
        (0, globals_1.expect)(access.cacheControl).toContain('immutable');
        (0, globals_1.expect)(auditLogger.recordEvent).toHaveBeenCalled();
    });
    test('rejects expired signed URLs', async () => {
        const service = new evidence_access_service_js_1.EvidenceAccessService({
            enableSignedUrls: true,
            enableTiered: false,
            signingKey: 'unit-test-key',
            signedUrlTtlSeconds: 30,
            auditLogger,
        });
        const access = await service.getAccessDescriptor(baseEvidence, {
            tenantId: 'tenant-1',
            caseId: 'case-1',
            derivativeType: 'original',
            now: new Date('2024-01-01T00:00:00Z'),
        });
        const validation = service.validateSignedToken(access.token, 'tenant-1', 'case-1', new Date('2024-01-01T00:02:00Z'));
        (0, globals_1.expect)(validation.valid).toBe(false);
        (0, globals_1.expect)(validation.reason).toBe('expired');
    });
});
(0, globals_1.describe)('EvidenceAccessService tiered lifecycle', () => {
    const auditLogger = { recordEvent: globals_1.jest.fn().mockResolvedValue('audit-2') };
    test('moves evidence to cold tier after threshold while preserving access', async () => {
        const service = new evidence_access_service_js_1.EvidenceAccessService({
            enableSignedUrls: false,
            enableTiered: true,
            coldAfterDays: 1,
            auditLogger,
        });
        const evidence = {
            id: 'ev-2',
            storage_uri: 's3://evidence-bucket/runs/run-2/attestation.json',
            collected_at: new Date('2024-01-01T00:00:00Z'),
        };
        const access = await service.getAccessDescriptor(evidence, {
            tenantId: 'tenant-2',
            caseId: 'case-2',
            derivativeType: 'original',
            now: new Date('2024-01-03T00:00:00Z'),
        });
        (0, globals_1.expect)(access.tier).toBe('cold');
        (0, globals_1.expect)(access.url).toContain('cold');
        (0, globals_1.expect)(access.direct).toBe(true);
        const state = await service.getTierState('ev-2');
        (0, globals_1.expect)(state?.movedToColdAt).toBeDefined();
        (0, globals_1.expect)(state?.lastAccessedAt?.toISOString()).toBe(new Date('2024-01-03T00:00:00.000Z').toISOString());
    });
});
