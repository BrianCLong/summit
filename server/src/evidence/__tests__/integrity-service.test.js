"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const integrity_service_js_1 = require("../integrity-service.js");
const queryMock = globals_1.jest.fn();
const incidentMock = globals_1.jest.fn();
globals_1.jest.mock('../../db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: (...args) => queryMock(...args),
    }),
}));
globals_1.jest.mock('../../incident.js', () => ({
    openIncident: (...args) => incidentMock(...args),
}));
(0, globals_1.describe)('EvidenceIntegrityService', () => {
    let storageRoot;
    (0, globals_1.beforeEach)(async () => {
        storageRoot = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'evidence-int-'));
        queryMock.mockReset();
        incidentMock.mockReset();
    });
    (0, globals_1.afterEach)(async () => {
        await promises_1.default.rm(storageRoot, { recursive: true, force: true });
    });
    test('reports hash mismatch for tampered file and emits incident when enabled', async () => {
        const inlineContent = Buffer.from('inline-ok');
        const inlineHash = crypto_1.default.createHash('sha256').update(inlineContent).digest('hex');
        const tamperedContent = 'tampered-content';
        const storedHash = crypto_1.default
            .createHash('sha256')
            .update('original-content')
            .digest('hex');
        const filePath = path_1.default.join(storageRoot, 'evidence', 'run-1', 'artifact.log');
        await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
        await promises_1.default.writeFile(filePath, tamperedContent);
        const artifactRows = [
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
                return { rows: artifactCall === 1 ? artifactRows : [] };
            }
            if (sql.includes('FROM evidence_artifact_content')) {
                return { rows: [{ content: inlineContent }] };
            }
            return { rows: [] };
        });
        const service = new integrity_service_js_1.EvidenceIntegrityService({ storageRoot });
        const result = await service.verifyAll({
            chunkSize: 2,
            rateLimitPerSecond: 100,
            emitIncidents: true,
        });
        const computedTamperedHash = crypto_1.default
            .createHash('sha256')
            .update(tamperedContent)
            .digest('hex');
        (0, globals_1.expect)(result.checked).toBe(2);
        (0, globals_1.expect)(result.mismatches).toHaveLength(1);
        (0, globals_1.expect)(result.mismatches[0]).toMatchObject({
            artifactId: 'file-1',
            mismatchType: 'hash_mismatch',
            storagePath: filePath,
            computedHash: computedTamperedHash,
        });
        (0, globals_1.expect)(incidentMock).toHaveBeenCalledTimes(1);
    });
    test('returns passing result when hashes match for inline content', async () => {
        const content = Buffer.from('expected-content');
        const hash = crypto_1.default.createHash('sha256').update(content).digest('hex');
        const artifactRows = [
            {
                id: 'inline-1',
                run_id: 'run-9',
                artifact_type: 'receipt',
                sha256_hash: hash,
                s3_key: 'inline://evidence_artifact_content/inline-1',
                created_at: new Date('2024-01-01T01:00:00Z'),
            },
        ];
        let artifactCall = 0;
        queryMock.mockImplementation(async (sql) => {
            if (sql.includes('FROM evidence_artifacts')) {
                artifactCall += 1;
                return { rows: artifactCall === 1 ? artifactRows : [] };
            }
            if (sql.includes('FROM evidence_artifact_content')) {
                return { rows: [{ content }] };
            }
            return { rows: [] };
        });
        const service = new integrity_service_js_1.EvidenceIntegrityService({ storageRoot });
        const result = await service.verifyAll({ chunkSize: 1, rateLimitPerSecond: 100 });
        (0, globals_1.expect)(result.checked).toBe(1);
        (0, globals_1.expect)(result.passed).toBe(1);
        (0, globals_1.expect)(result.mismatches).toHaveLength(0);
        (0, globals_1.expect)(incidentMock).not.toHaveBeenCalled();
    });
});
