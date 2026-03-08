"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppCore = createAppCore;
// @ts-nocheck
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
async function createAppCore() {
    const app = (0, express_1.default)();
    const logger = pino_1.default();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
        credentials: true,
    }));
    app.use((0, pino_http_1.default)({ logger, redact: ['req.headers.authorization'] }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, express_rate_limit_1.default)({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
        max: Number(process.env.RATE_LIMIT_MAX || 600),
        message: { error: 'Too many requests, please try again later' },
    }));
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });
    return app;
}
