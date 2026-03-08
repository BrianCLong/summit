"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const evidenceRegistry_js_1 = require("../evidenceRegistry.js");
const ediscoveryExportService_js_1 = require("../ediscoveryExportService.js");
const createTempDir = async () => {
    const dir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'ediscovery-'));
    return dir;
};
(0, globals_1.describe)('EDiscoveryExportService', () => {
    let tmpDir;
    let registry;
    (0, globals_1.beforeEach)(async () => {
        tmpDir = await createTempDir();
        registry = new evidenceRegistry_js_1.EvidenceRegistry();
    });
    (0, globals_1.afterEach)(async () => {
        await promises_1.default.rm(tmpDir, { recursive: true, force: true });
    });
    (0, globals_1.it)('produces hashed manifests and custody trail entries', async () => {
        const service = new ediscoveryExportService_js_1.EDiscoveryExportService({
            outputDir: tmpDir,
            evidenceRegistry: registry,
        });
        const scope = {
            datasetId: 'customer-emails',
            holdId: 'HOLD-123',
            description: 'Email export for discovery',
            filters: { date_gte: '2024-01-01' },
        };
        const records = [
            { id: '1', subject: 'Hello', body: 'Test', timestamp: '2024-02-01' },
            { id: '2', subject: 'Reminder', body: 'Contract', timestamp: '2024-02-02' },
        ];
        const result = await service.exportDataset(scope, records);
        (0, globals_1.expect)(node_fs_1.default.existsSync(result.manifest.payloadPath)).toBe(true);
        const payload = (await promises_1.default.readFile(result.manifest.payloadPath, {
            encoding: 'utf8',
        }));
        const computedHash = node_crypto_1.default
            .createHash('sha256')
            .update(await promises_1.default.readFile(result.manifest.payloadPath))
            .digest('hex');
        (0, globals_1.expect)(computedHash).toBe(result.manifest.checksum);
        (0, globals_1.expect)(result.manifest.recordCount).toBe(2);
        const artifact = registry.getArtifact(result.evidenceArtifact.id);
        (0, globals_1.expect)(artifact?.hash).toBe(artifact?.custodyTrail[0].checksum);
        (0, globals_1.expect)(artifact?.custodyTrail).toHaveLength(2);
        (0, globals_1.expect)(artifact?.custodyTrail[1].eventType).toBe('exported');
        (0, globals_1.expect)(artifact?.custodyTrail[1].checksum).toBe(result.manifest.checksum);
        const lines = payload.trim().split('\n');
        (0, globals_1.expect)(lines).toHaveLength(2);
        (0, globals_1.expect)(lines[0]).toContain('HOLD-123');
    });
});
