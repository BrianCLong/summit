"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
function createServer(evaluator) {
    const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL ?? 'info' });
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, pino_http_1.default)({ logger }));
    app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));
    app.post('/v1/evidence', async (req, res) => {
        const evidence = req.body;
        const nowIso = new Date().toISOString();
        try {
            const att = await evaluator.handleEvidence(evidence, nowIso);
            res.status(200).json({ attestation: att });
        }
        catch (err) {
            req.log.error({ err }, 'evaluation failed');
            res.status(500).json({ error: 'evaluation_failed' });
        }
    });
    return { app, logger };
}
