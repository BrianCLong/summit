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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const crypto = __importStar(require("crypto"));
const dsar_1 = require("../../src/privacy/dsar");
const subjectId = 'sub-001';
const tenantId = 'tenant-a';
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
(async () => {
    const exportRequest = {
        requestId: 'req-export-1',
        subjectId,
        tenantId,
        operation: 'export',
        identityProof: { method: 'email', token: 'token-123' },
        replayKey: 'case-1',
    };
    const first = await engine.execute(exportRequest);
    strict_1.default.equal(first.type, 'export');
    strict_1.default.equal(first.meta.idempotentReplay, false);
    const stored = await storage.getObject(`${tenantId}/${exportRequest.requestId}.json`);
    strict_1.default.ok(stored, 'export pack stored in S3');
    const parsed = JSON.parse(stored);
    strict_1.default.ok(signer.verify(parsed.payload, parsed.signature), 'signature verifies');
    const second = await engine.execute(exportRequest);
    strict_1.default.equal(second.meta.idempotentReplay, true);
    strict_1.default.deepEqual(second.result, first.result);
    strict_1.default.equal(postgres.calls.collect, 1);
    strict_1.default.equal(elastic.calls.collect, 1);
    const rectify = await engine.execute({
        requestId: 'req-rectify-1',
        subjectId,
        tenantId,
        operation: 'rectify',
        identityProof: { method: 'email', token: 'token-123' },
        payload: {
            postgres: { profile: { email: 'updated@example.com' } },
            elasticsearch: { activity: { email: 'updated@example.com' } },
        },
    });
    strict_1.default.equal(rectify.type, 'rectify');
    strict_1.default.equal(rectify.result.proofs.length, 2);
    rectify.result.proofs.forEach((proof) => strict_1.default.ok((0, dsar_1.validateRectificationProof)(proof)));
    const deletion = await engine.execute({
        requestId: 'req-delete-1',
        subjectId,
        tenantId,
        operation: 'delete',
        identityProof: { method: 'email', token: 'token-123' },
    });
    strict_1.default.equal(deletion.type, 'delete');
    strict_1.default.equal(deletion.result.proofs.length, 2);
    deletion.result.proofs.forEach((proof) => {
        strict_1.default.ok((0, dsar_1.validateDeletionProof)(proof));
    });
    const postgresSnapshot = await postgres.snapshot();
    const elasticSnapshot = await elastic.snapshot();
    deletion.result.proofs.forEach((proof) => {
        const snapshot = proof.connector === 'postgres' ? postgresSnapshot : elasticSnapshot;
        strict_1.default.ok((0, dsar_1.validateDeletionProofAgainstSnapshot)(proof, snapshot));
    });
    console.log('DFE integration checks completed');
})();
