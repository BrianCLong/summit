"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const exporter_1 = require("../src/exporter");
const streaming_1 = require("../src/streaming");
const sample = {
    entities: [{ id: '1', name: 'Alice', secret: 's1' }],
    edges: [{ source: '1', target: '2', weight: 5, secret: 'e1' }],
    redactRules: [{ field: 'secret', action: 'drop' }],
    format: ['json', 'csv', 'pdf'],
};
describe('streaming export', () => {
    it('supports chunked hashing with resume and verifies import integrity', async () => {
        const tmpDir = await fs_1.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'export-stream-'));
        const outputPath = path_1.default.join(tmpDir, 'export.zip');
        const checkpointPath = path_1.default.join(tmpDir, 'checkpoint.json');
        const controller = new AbortController();
        const progressSeen = [];
        await expect((0, streaming_1.createStreamingExport)(sample, {
            outputPath,
            checkpointPath,
            chunkSize: 1024,
            signal: controller.signal,
            onProgress: (progress) => {
                progressSeen.push(progress.bytesProcessed);
                controller.abort();
            },
        })).rejects.toThrow();
        const initialCheckpoint = JSON.parse(await fs_1.promises.readFile(checkpointPath, 'utf-8'));
        expect(initialCheckpoint.bytesProcessed).toBeGreaterThan(0);
        const partialSize = (await fs_1.promises.stat(outputPath)).size;
        expect(partialSize).toBeLessThanOrEqual(initialCheckpoint.bytesProcessed);
        expect(progressSeen.length).toBeGreaterThan(0);
        const completed = await (0, streaming_1.createStreamingExport)(sample, {
            outputPath,
            checkpointPath,
            chunkSize: 1024,
        });
        const finalCheckpoint = JSON.parse(await fs_1.promises.readFile(checkpointPath, 'utf-8'));
        expect(finalCheckpoint.completed).toBe(true);
        expect(finalCheckpoint.hash).toBe(completed.hash);
        const finalHash = (0, crypto_1.createHash)('sha256')
            .update(await fs_1.promises.readFile(outputPath))
            .digest('hex');
        expect(finalHash).toBe(completed.hash);
        const baseline = await (0, exporter_1.createExport)(sample);
        const baselineHash = (0, crypto_1.createHash)('sha256').update(baseline).digest('hex');
        expect(baselineHash).toBe(finalHash);
        const importCheckpoint = path_1.default.join(tmpDir, 'import-checkpoint.json');
        const importResult = await (0, streaming_1.verifyImportWithCheckpoint)(outputPath, importCheckpoint, { chunkSize: 1024 });
        expect(importResult.hash).toBe(finalHash);
        expect(importResult.chunkHashes.length).toBeGreaterThan(0);
    });
});
