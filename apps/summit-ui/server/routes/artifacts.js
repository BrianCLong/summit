"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifactsRouter = void 0;
/**
 * /api/artifacts
 *
 * Reads .artifacts/pr/*.json files and exposes them with filtering/pagination.
 */
const express_1 = require("express");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const config_js_1 = require("../config.js");
const metrics_js_1 = require("../utils/metrics.js");
exports.artifactsRouter = (0, express_1.Router)();
async function loadArtifacts() {
    let files;
    try {
        files = await (0, promises_1.readdir)(config_js_1.PATHS.artifactsPr);
    }
    catch {
        return [];
    }
    const results = [];
    for (const file of files) {
        if ((0, path_1.extname)(file) !== '.json' || file === 'schema.json')
            continue;
        try {
            const raw = await (0, promises_1.readFile)((0, path_1.join)(config_js_1.PATHS.artifactsPr, file), 'utf-8');
            const data = JSON.parse(raw);
            if (typeof data.pr === 'number' && data.status && data.timestamp) {
                results.push({ ...data, file });
            }
        }
        catch {
            // skip malformed files
        }
    }
    // Sort newest first
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
// GET /api/artifacts?page=1&pageSize=20&status=superseded
exports.artifactsRouter.get('/', async (req, res) => {
    (0, metrics_js_1.incCounter)('summit_ui_artifact_list_total', 'Artifact list requests');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const status = req.query.status ? String(req.query.status) : undefined;
    const all = await loadArtifacts();
    const filtered = status ? all.filter((a) => a.status === status) : all;
    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    res.json({ items, total, page, pageSize });
});
// GET /api/artifacts/summary – counts by status
exports.artifactsRouter.get('/summary', async (_req, res) => {
    const all = await loadArtifacts();
    const byStatus = {};
    for (const a of all) {
        byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }
    res.json({ total: all.length, byStatus });
});
// GET /api/artifacts/:pr – single artifact by PR number
exports.artifactsRouter.get('/:pr', async (req, res) => {
    const prNum = Number(req.params.pr);
    if (isNaN(prNum)) {
        res.status(400).json({ error: 'Invalid PR number' });
        return;
    }
    const all = await loadArtifacts();
    const found = all.filter((a) => a.pr === prNum);
    if (found.length === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(found);
});
