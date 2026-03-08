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
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
const express_1 = __importDefault(require("express"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const supertest_1 = __importDefault(require("supertest"));
globals_1.jest.mock('../../scripts/maintenance.js', () => ({ runMaintenance: globals_1.jest.fn() }));
globals_1.jest.mock('../../backup/BackupService.js', () => ({
    BackupService: globals_1.jest.fn().mockImplementation(() => ({
        backupPostgres: globals_1.jest.fn(),
        backupNeo4j: globals_1.jest.fn(),
        backupRedis: globals_1.jest.fn(),
    })),
}));
globals_1.jest.mock('../../dr/DisasterRecoveryService.js', () => ({
    DisasterRecoveryService: globals_1.jest.fn().mockImplementation(() => ({
        runDrill: globals_1.jest.fn().mockResolvedValue(true),
        getStatus: globals_1.jest.fn().mockResolvedValue({ ok: true }),
    })),
}));
const ops_js_1 = __importDefault(require("../ops.js"));
const integrity_service_js_1 = require("../../evidence/integrity-service.js");
const integrityModule = __importStar(require("../../evidence/integrity-service.js"));
const queryMock = globals_1.jest.fn();
const incidentMock = globals_1.jest.fn();
globals_1.jest.mock('../../incident.js', () => ({
    openIncident: (...args) => incidentMock(...args),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('POST /ops/evidence/verify', () => {
    let app;
    let storageRoot;
    (0, globals_1.beforeEach)(async () => {
        storageRoot = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'evidence-ops-'));
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/ops', ops_js_1.default);
        queryMock.mockReset();
        incidentMock.mockReset();
    });
    (0, globals_1.afterEach)(async () => {
        globals_1.jest.restoreAllMocks();
        await promises_1.default.rm(storageRoot, { recursive: true, force: true });
        delete process.env.EVIDENCE_INTEGRITY;
    });
    (0, globals_1.it)('rejects requests when EVIDENCE_INTEGRITY flag is disabled', async () => {
        process.env.EVIDENCE_INTEGRITY = 'false';
        const response = await (0, supertest_1.default)(app).post('/ops/evidence/verify');
        (0, globals_1.expect)(response.status).toBe(503);
        (0, globals_1.expect)(response.body.ok).toBe(false);
    });
    (0, globals_1.it)('returns mismatch details and emits an incident for tampered artifacts', async () => {
        process.env.EVIDENCE_INTEGRITY = 'true';
        const tamperedContent = 'tampered';
        const storedHash = crypto_1.default.createHash('sha256').update('original').digest('hex');
        const filePath = path_1.default.join(storageRoot, 'evidence', 'run-1', 'artifact.log');
        await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
        await promises_1.default.writeFile(filePath, tamperedContent);
        const inlineContent = Buffer.from('inline-ok');
        const inlineHash = crypto_1.default.createHash('sha256').update(inlineContent).digest('hex');
        const artifacts = [
            {
                id: 'inline-1',
                run_id: 'run-1',
                artifact_type: 'log',
                sha256_hash: inlineHash,
                s3_key: 'inline://evidence_artifact_content/inline-1',
                created_at: new Date('2024-01-01T00:00:00Z'),
            },
            {
                id: 'file-1',
                run_id: 'run-1',
                artifact_type: 'log',
                sha256_hash: storedHash,
                s3_key: path_1.default.relative(storageRoot, filePath),
                created_at: new Date('2024-01-01T00:00:10Z'),
            },
        ];
        let artifactCall = 0;
        queryMock.mockImplementation(async (sql) => {
            if (sql.includes('FROM evidence_artifacts')) {
                artifactCall += 1;
                return { rows: artifactCall === 1 ? artifacts : [] };
            }
            if (sql.includes('FROM evidence_artifact_content')) {
                return { rows: [{ content: inlineContent }] };
            }
            return { rows: [] };
        });
        const service = new integrity_service_js_1.EvidenceIntegrityService({ storageRoot, pool: { query: queryMock } });
        globals_1.jest
            .spyOn(integrityModule.evidenceIntegrityService, 'verifyAll')
            .mockImplementation((options) => service.verifyAll({ ...options, rateLimitPerSecond: 100, emitIncidents: true }));
        const response = await (0, supertest_1.default)(app)
            .post('/ops/evidence/verify')
            .send({ chunkSize: 2, rateLimitPerSecond: 100, emitIncidents: true });
        const computedTamperedHash = crypto_1.default.createHash('sha256').update(tamperedContent).digest('hex');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.ok).toBe(true);
        (0, globals_1.expect)(response.body.mismatches).toHaveLength(1);
        (0, globals_1.expect)(response.body.mismatches[0]).toMatchObject({
            artifactId: 'file-1',
            storagePath: filePath,
            mismatchType: 'hash_mismatch',
            computedHash: computedTamperedHash,
            fileHash: computedTamperedHash,
        });
        (0, globals_1.expect)(incidentMock).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('returns passing verification for valid artifacts', async () => {
        process.env.EVIDENCE_INTEGRITY = 'true';
        const content = Buffer.from('expected-content');
        const hash = crypto_1.default.createHash('sha256').update(content).digest('hex');
        const inlineKey = 'inline://evidence_artifact_content/inline-1';
        const artifacts = [
            {
                id: 'inline-1',
                run_id: 'run-9',
                artifact_type: 'receipt',
                sha256_hash: hash,
                s3_key: inlineKey,
                created_at: new Date('2024-01-01T01:00:00Z'),
            },
        ];
        let artifactCall = 0;
        queryMock.mockImplementation(async (sql) => {
            if (sql.includes('FROM evidence_artifacts')) {
                artifactCall += 1;
                return { rows: artifactCall === 1 ? artifacts : [] };
            }
            if (sql.includes('FROM evidence_artifact_content')) {
                return { rows: [{ content }] };
            }
            return { rows: [] };
        });
        const service = new integrity_service_js_1.EvidenceIntegrityService({ storageRoot, pool: { query: queryMock } });
        globals_1.jest
            .spyOn(integrityModule.evidenceIntegrityService, 'verifyAll')
            .mockImplementation((options) => service.verifyAll({ ...options, rateLimitPerSecond: 100, emitIncidents: true }));
        const response = await (0, supertest_1.default)(app)
            .post('/ops/evidence/verify')
            .send({ chunkSize: 2, rateLimitPerSecond: 100 });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.ok).toBe(true);
        (0, globals_1.expect)(response.body.checked).toBe(1);
        (0, globals_1.expect)(response.body.passed).toBe(1);
        (0, globals_1.expect)(response.body.mismatches).toHaveLength(0);
        (0, globals_1.expect)(incidentMock).not.toHaveBeenCalled();
    });
});
