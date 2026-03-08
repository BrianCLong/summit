"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const exporter_1 = require("./exporter");
const streaming_1 = require("./streaming");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
const streamingEnabled = process.env.STREAMING_BULK_IO === '1';
const progressState = new Map();
const checkpointByJob = new Map();
const outputByJob = new Map();
app.post('/export', async (req, res) => {
    const body = req.body;
    const wantsStream = streamingEnabled && (String(req.query.stream || '') === '1' || req.headers['x-stream-bulk-io'] === '1');
    const jobId = (wantsStream && typeof req.query.jobId === 'string' && req.query.jobId) ||
        crypto_1.default.randomUUID();
    if (!wantsStream) {
        try {
            const zip = await (0, exporter_1.createExport)(body);
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');
            res.send(zip);
        }
        catch (err) {
            console.error('Export request failed', err);
            res.status(400).json({ error: 'export_failed' });
        }
        return;
    }
    const baseDir = (0, path_1.join)((0, os_1.tmpdir)(), 'streaming-exports');
    const checkpointPath = checkpointByJob.get(jobId) || (0, path_1.join)(baseDir, `${jobId}.checkpoint.json`);
    const outputPath = outputByJob.get(jobId) || (0, path_1.join)(baseDir, `${jobId}.zip`);
    checkpointByJob.set(jobId, checkpointPath);
    outputByJob.set(jobId, outputPath);
    try {
        await fs_1.promises.mkdir(baseDir, { recursive: true });
        const result = await (0, streaming_1.createStreamingExport)(body, {
            outputPath,
            checkpointPath,
            onProgress: (progress) => {
                progressState.set(jobId, {
                    bytesProcessed: progress.bytesProcessed,
                    percent: progress.percent,
                    stage: progress.stage,
                });
            },
        });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');
        res.setHeader('X-Export-Job', jobId);
        res.setHeader('X-Export-Hash', result.hash);
        const stream = (0, fs_1.createReadStream)(outputPath);
        stream.on('close', () => {
            progressState.set(jobId, {
                bytesProcessed: progressState.get(jobId)?.bytesProcessed ?? 0,
                percent: 100,
                stage: 'export',
            });
        });
        stream.pipe(res);
    }
    catch (err) {
        console.error('Streaming export failed', err);
        res.status(400).json({ error: 'stream_export_failed', jobId });
    }
});
app.get('/export/progress/:jobId', async (req, res) => {
    if (!streamingEnabled) {
        return res.status(404).json({ error: 'streaming_disabled' });
    }
    const jobId = req.params.jobId;
    const progress = progressState.get(jobId) || null;
    const checkpointPath = checkpointByJob.get(jobId) || null;
    let checkpoint = null;
    if (checkpointPath) {
        try {
            const raw = await fs_1.promises.readFile(checkpointPath, 'utf-8');
            const parsed = JSON.parse(raw);
            checkpoint = {
                bytesProcessed: parsed.bytesProcessed,
                percent: progress?.percent,
            };
        }
        catch {
            checkpoint = null;
        }
    }
    res.json({
        jobId,
        progress,
        checkpoint,
    });
});
exports.default = app;
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Exporter listening on ${port}`));
}
