"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reconciler_1 = require("./reconciler");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const precedenceEnv = process.env.CSR_SOURCE_PRECEDENCE;
let precedenceConfig;
if (precedenceEnv) {
    const sources = precedenceEnv
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    if (sources.length > 0) {
        precedenceConfig = { sources };
    }
}
const reconciler = new reconciler_1.ConsentStateReconciler(precedenceConfig);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.post('/ingest', (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'records payload must be an array' });
    }
    const missing = records.filter((record) => !record.recordId || !record.subjectId || !record.consentType || !record.status || !record.source || !record.timestamp);
    if (missing.length > 0) {
        return res.status(400).json({ error: 'each record must include recordId, subjectId, consentType, status, source, timestamp' });
    }
    try {
        const result = reconciler.ingest(records);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/diff/:snapshotId', (req, res) => {
    const { snapshotId } = req.params;
    try {
        const result = reconciler.diff(snapshotId);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
app.post('/rollback', (req, res) => {
    const { snapshotId } = req.body;
    if (!snapshotId) {
        return res.status(400).json({ error: 'snapshotId is required' });
    }
    try {
        const snapshot = reconciler.rollback(snapshotId);
        res.json({ snapshotId: snapshot.id, restoredAt: new Date().toISOString() });
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
app.get('/state/:subjectId', (req, res) => {
    const { subjectId } = req.params;
    const state = reconciler.getSubjectState(subjectId);
    if (!state) {
        return res.status(404).json({ error: 'subject not found' });
    }
    res.json({ subjectId, state });
});
const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Consent State Reconciler listening on port ${port}`);
});
exports.default = app;
