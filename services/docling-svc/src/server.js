"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const config_js_1 = require("./config.js");
const docling_handler_js_1 = require("./handlers/docling-handler.js");
const ledger_js_1 = require("./provenance/ledger.js");
const config = (0, config_js_1.loadConfig)();
const logger = (0, pino_1.default)({ level: config.LOG_LEVEL });
const createApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '20mb' }));
    app.use((0, pino_http_1.default)({
        logger: logger,
        customSuccessMessage: () => 'docling-request',
        autoLogging: true,
        redact: {
            paths: [
                'req.headers.authorization',
                'req.body.bytes',
                'req.body.text',
                'res.body.result',
                'res.body.fallback',
            ],
            censor: '[redacted]',
        },
    }));
    const handler = new docling_handler_js_1.DoclingHandler();
    app.post('/v1/parse', handler.parse);
    app.post('/v1/summarize', handler.summarize);
    app.post('/v1/extract', handler.extract);
    app.get('/healthz', (_req, res) => {
        res.json({
            status: 'ok',
            modelId: config.GRANITE_DOCLING_MODEL_ID,
            cacheEntries: handler.cacheSize(),
            timestamp: new Date().toISOString(),
        });
    });
    app.get('/metrics', handler.metrics);
    ledger_js_1.provenanceEmitter.on('provenance', (event) => {
        logger.debug({ event }, 'provenance-event');
    });
    return app;
};
exports.createApp = createApp;
const startServer = () => {
    const app = (0, exports.createApp)();
    let server;
    if (config.MTLS_ENABLED === 'true') {
        const options = {
            key: fs_1.default.readFileSync(config.MTLS_KEY_PATH || ''),
            cert: fs_1.default.readFileSync(config.MTLS_CERT_PATH || ''),
            ca: config.MTLS_CA_PATH
                ? fs_1.default.readFileSync(config.MTLS_CA_PATH)
                : undefined,
            requestCert: true,
            rejectUnauthorized: true,
        };
        server = https_1.default.createServer(options, app);
    }
    else {
        server = http_1.default.createServer(app);
    }
    server.listen(config.port, config.HOST, () => {
        logger.info({ port: config.port }, 'docling-svc started');
    });
    return server;
};
exports.startServer = startServer;
