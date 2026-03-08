"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const globals_1 = require("@jest/globals");
const dsar_1 = require("../../src/privacy/dsar");
const subjectId = 'sub-001';
const tenantId = 'tenant-a';
const buildEngine = () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    const signer = new dsar_1.ExportPackSigner(privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(), publicKey.export({ type: 'pkcs1', format: 'pem' }).toString());
    const postgres = new dsar_1.InMemoryPostgresConnector([
        {
            table: 'profile',
            subjectId,
            tenantId,
            data: {
                email: 'original@example.com',
                name: 'Fixture User',
                ssn: '123-45-6789',
            },
        },
        {
            table: 'sessions',
            subjectId,
            tenantId,
            data: { lastLogin: '2025-09-01T00:00:00.000Z', ip: '203.0.113.5' },
        },
    ]);
    const elastic = new dsar_1.InMemoryElasticsearchConnector([
        {
            id: 'activity-1',
            subjectId,
            tenantId,
            index: 'activity',
            body: {
                action: 'login',
                email: 'original@example.com',
                timestamp: '2025-09-01T00:00:00.000Z',
            },
        },
        {
            id: 'activity-2',
            subjectId,
            tenantId,
            index: 'activity',
            body: { action: 'purchase', amount: 49.99, currency: 'USD' },
        },
    ]);
    const kafka = new dsar_1.InMemoryKafkaEventLog();
    const storage = new dsar_1.InMemoryS3Storage('s3://fixtures-dsar');
    const engine = new dsar_1.DataSubjectFulfillmentEngine({
        connectors: [postgres, elastic],
        storage,
        kafka,
        signer,
        identityVerifier: new dsar_1.StaticIdentityVerifier({ [subjectId]: 'token-123' }),
        redactionRules: [
            (0, dsar_1.createFieldMaskRule)('postgres', ['email', 'ssn'], '***-masked'),
            (0, dsar_1.createFieldMaskRule)('elasticsearch', ['email'], '***-masked'),
        ],
    });
    return { engine, postgres, elastic, kafka, storage, signer };
};
(0, globals_1.describe)('DataSubjectFulfillmentEngine', () => {
    (0, globals_1.it)('produces deterministic export packs with offline-verifiable signatures', async () => {
        const { engine, postgres, elastic, storage, signer } = buildEngine();
        const request = {
            requestId: 'req-export-1',
            subjectId,
            tenantId,
            operation: 'export',
            identityProof: { method: 'email', token: 'token-123' },
            replayKey: 'case-1',
        };
        const first = await engine.execute(request);
        (0, globals_1.expect)(first.type).toBe('export');
        const exportResult = first.result;
        (0, globals_1.expect)(first.meta.idempotentReplay).toBe(false);
        (0, globals_1.expect)(exportResult.pack.manifest.connectors).toHaveLength(2);
        const stored = await storage.getObject(`${tenantId}/${request.requestId}.json`);
        (0, globals_1.expect)(stored).toBeDefined();
        const parsed = JSON.parse(stored);
        (0, globals_1.expect)(signer.verify(parsed.payload, parsed.signature)).toBe(true);
        const second = await engine.execute(request);
        (0, globals_1.expect)(second.meta.idempotentReplay).toBe(true);
        (0, globals_1.expect)(second.result).toEqual(exportResult);
        (0, globals_1.expect)(postgres.calls.collect).toBe(1);
        (0, globals_1.expect)(elastic.calls.collect).toBe(1);
    });
    (0, globals_1.it)('rectifies records and emits validating proofs', async () => {
        const { engine, postgres } = buildEngine();
        const rectify = await engine.execute({
            requestId: 'req-rectify-1',
            subjectId,
            tenantId,
            operation: 'rectify',
            identityProof: { method: 'email', token: 'token-123' },
            payload: {
                postgres: {
                    profile: { email: 'updated@example.com' },
                },
                elasticsearch: {
                    activity: { email: 'updated@example.com' },
                },
            },
        });
        (0, globals_1.expect)(rectify.type).toBe('rectify');
        const rectifyResult = rectify.result;
        (0, globals_1.expect)(rectifyResult.proofs).toHaveLength(2);
        rectifyResult.proofs.forEach((proof) => {
            (0, globals_1.expect)((0, dsar_1.validateRectificationProof)(proof)).toBe(true);
        });
        const rows = postgres.getRows(subjectId, tenantId);
        const updatedProfile = rows.find((row) => row.table === 'profile');
        (0, globals_1.expect)(updatedProfile?.data.email).toBe('updated@example.com');
    });
    (0, globals_1.it)('deletes records and produces inclusion-failure proofs', async () => {
        const { engine, postgres, elastic } = buildEngine();
        await engine.execute({
            requestId: 'req-rectify-setup',
            subjectId,
            tenantId,
            operation: 'rectify',
            identityProof: { method: 'email', token: 'token-123' },
            payload: {
                postgres: { profile: { email: 'rectify@example.com' } },
            },
        });
        const deletion = await engine.execute({
            requestId: 'req-delete-1',
            subjectId,
            tenantId,
            operation: 'delete',
            identityProof: { method: 'email', token: 'token-123' },
        });
        (0, globals_1.expect)(deletion.type).toBe('delete');
        const deletionResult = deletion.result;
        (0, globals_1.expect)(deletionResult.proofs).toHaveLength(2);
        deletionResult.proofs.forEach((proof) => {
            (0, globals_1.expect)((0, dsar_1.validateDeletionProof)(proof)).toBe(true);
        });
        const postgresSnapshot = await postgres.snapshot();
        const elasticSnapshot = await elastic.snapshot();
        deletionResult.proofs.forEach((proof) => {
            const snapshot = proof.connector === 'postgres' ? postgresSnapshot : elasticSnapshot;
            (0, globals_1.expect)((0, dsar_1.validateDeletionProofAgainstSnapshot)(proof, snapshot)).toBe(true);
        });
    });
});
