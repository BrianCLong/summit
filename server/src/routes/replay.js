"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const manifest_js_1 = require("../replay/manifest.js");
const runner_js_1 = require("../replay/runner.js");
const diff_js_1 = require("../replay/diff.js");
const r = (0, express_1.Router)();
r.post('/replay/:runId', async (req, res) => {
    const out = await (0, runner_js_1.replayRun)(req.params.runId, { allowNet: false });
    res.json({ ok: true, out });
});
r.get('/replay/manifest/:runId', async (req, res) => {
    const m = await (0, manifest_js_1.buildManifest)(req.params.runId);
    res.json(m);
});
r.get('/replay/diff', async (req, res) => {
    const d = await (0, diff_js_1.diffRuns)(String(req.query.a), String(req.query.b));
    res.json(d);
});
exports.default = r;
