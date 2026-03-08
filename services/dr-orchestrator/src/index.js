"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/dr/backup', async (_req, res) => {
    // Placeholder for quiesce calls and backup logic
    res.json({
        artifactUrl: 's3://placeholder',
        sha256: '0000',
        snapshotId: 'snapshot-0',
    });
});
app.post('/dr/restore', (_req, res) => {
    const jobId = `job-${Date.now()}`;
    res.json({ jobId });
});
app.get('/dr/status/:id', (req, res) => {
    res.json({ id: req.params.id, progress: 0, verified: false });
});
exports.default = app;
