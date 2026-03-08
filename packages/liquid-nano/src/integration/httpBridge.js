"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHttpBridge = startHttpBridge;
const crypto = __importStar(require("node:crypto"));
const http = __importStar(require("node:http"));
const edgeIngestionApp_js_1 = require("../applications/edgeIngestionApp.js");
function startHttpBridge(options = {}) {
    const ingestionOptions = {
        ...(options.transform ? { transform: options.transform } : {}),
        ...(options.onPersist ? { onPersist: options.onPersist } : {})
    };
    const { runtime, ingest } = (0, edgeIngestionApp_js_1.createEdgeIngestionApp)(ingestionOptions);
    void runtime.start();
    const server = http.createServer(async (req, res) => {
        if (req.method === 'GET' && req.url === '/health') {
            const failures = runtime.flushDiagnostics().filter((entry) => entry.status === 'failed');
            res.writeHead(failures.length === 0 ? 200 : 503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: failures.length === 0 ? 'ok' : 'degraded', failedEvents: failures.length }));
            return;
        }
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end('method not allowed');
            return;
        }
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const payload = JSON.parse(Buffer.concat(chunks).toString());
                const event = {
                    type: 'sensor.ingested',
                    payload,
                    timestamp: new Date(),
                    metadata: {
                        correlationId: payload.correlationId ?? crypto.randomUUID(),
                        source: 'http'
                    }
                };
                await ingest(event);
                res.writeHead(202);
                res.end('accepted');
            }
            catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    });
    server.listen(options.port ?? 3001);
    return server;
}
