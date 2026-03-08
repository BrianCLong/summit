"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDiscoveryExportService = void 0;
// @ts-nocheck
const node_fs_1 = __importDefault(require("node:fs"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
class EDiscoveryExportService {
    outputDir;
    evidenceRegistry;
    constructor(options) {
        this.outputDir = options.outputDir;
        this.evidenceRegistry = options.evidenceRegistry;
        node_fs_1.default.mkdirSync(this.outputDir, { recursive: true });
    }
    async exportDataset(scope, records) {
        const payloadPath = await this.writePayload(scope, records);
        const checksum = await this.hashFile(payloadPath);
        const manifest = {
            manifestId: node_crypto_1.default.randomUUID(),
            holdId: scope.holdId,
            datasetId: scope.datasetId,
            createdAt: new Date(),
            recordCount: records.length,
            payloadPath,
            checksum,
            scope,
            verifier: 'sha256',
        };
        const artifact = await this.evidenceRegistry.registerArtifact({
            holdId: scope.holdId,
            datasetId: scope.datasetId,
            system: 'ediscovery-export',
            location: payloadPath,
            notes: scope.description,
            tags: ['ediscovery', 'export'],
            payload: await promises_1.default.readFile(payloadPath),
        });
        const custodyEvent = {
            artifactId: artifact.id,
            eventType: 'exported',
            actor: 'ediscovery-service',
            channel: 'filesystem',
            occurredAt: new Date(),
            notes: 'Export manifest finalized',
            checksum,
        };
        await this.evidenceRegistry.recordCustodyEvent(custodyEvent);
        return { manifest, custodyEvent, evidenceArtifact: artifact };
    }
    async writePayload(scope, records) {
        const filename = `${scope.datasetId}-${scope.holdId}-${Date.now()}.jsonl`;
        const payloadPath = node_path_1.default.join(this.outputDir, filename);
        const serialized = records
            .map((record) => JSON.stringify({ ...record, holdId: scope.holdId }))
            .join('\n');
        await promises_1.default.writeFile(payloadPath, serialized, 'utf8');
        return payloadPath;
    }
    async hashFile(filePath) {
        const hash = node_crypto_1.default.createHash('sha256');
        const data = await promises_1.default.readFile(filePath);
        hash.update(data);
        return hash.digest('hex');
    }
}
exports.EDiscoveryExportService = EDiscoveryExportService;
