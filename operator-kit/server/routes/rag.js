"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragRouter = void 0;
const express_1 = __importDefault(require("express"));
const metrics_1 = require("../metrics");
const events_1 = require("../events");
exports.ragRouter = express_1.default.Router();
let lastIndexedAt = Date.now() - 1000 * 60 * 60 * 25; // pretend stale by 25h
const corpus = process.env.RAG_CORPUS || 'docs';
exports.ragRouter.get('/status', (_req, res) => {
    const staleness = Math.max(0, Math.floor((Date.now() - lastIndexedAt) / 1000));
    metrics_1.ragStaleness.labels(corpus).set(staleness);
    (0, events_1.emit)({ type: 'rag.index.freshness', corpus, staleness_s: staleness });
    res.json({
        corpus,
        last_indexed_at: new Date(lastIndexedAt).toISOString(),
        staleness_seconds: staleness,
        warn: staleness > 86400,
    });
});
exports.ragRouter.post('/reindex', (req, res) => {
    const dry = String(req.query.dry_run || '0') === '1';
    if (dry)
        return res.json({
            estimate_docs: 1200,
            estimate_tokens: 1.8e6,
            estimate_duration_s: 420,
        });
    lastIndexedAt = Date.now();
    res.json({
        ok: true,
        last_indexed_at: new Date(lastIndexedAt).toISOString(),
    });
});
