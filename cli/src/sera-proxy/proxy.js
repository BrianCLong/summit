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
exports.startSeraProxy = startSeraProxy;
const http = __importStar(require("http"));
const evidence_js_1 = require("./evidence.js");
const POLICY_DECISION_ID = 'sera-proxy-allowlist:v1';
async function startSeraProxy(config) {
    const evidence = new evidence_js_1.SeraProxyEvidenceStore(config.artifactDir, config.endpointHost);
    const server = http.createServer(async (req, res) => {
        if (req.url === '/healthz') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
            return;
        }
        if (!req.url || req.url !== '/v1/chat/completions') {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }
        if (req.method !== 'POST') {
            res.writeHead(405, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
        let bodyBuffer;
        try {
            bodyBuffer = await readRequestBody(req, config.maxBodyBytes);
        }
        catch (error) {
            res.writeHead(413, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            evidence.recordBlocked(config.maxBodyBytes + 1);
            return;
        }
        const bodyText = bodyBuffer.toString('utf8');
        let payload;
        try {
            payload = JSON.parse(bodyText);
        }
        catch (error) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            return;
        }
        if (config.model) {
            payload = { ...payload, model: config.model };
        }
        const forwardedBody = JSON.stringify(payload);
        try {
            const upstreamResponse = await fetch(config.endpoint, {
                method: 'POST',
                headers: buildUpstreamHeaders(config),
                body: forwardedBody,
            });
            const responseText = await upstreamResponse.text();
            res.statusCode = upstreamResponse.status;
            res.setHeader('content-type', upstreamResponse.headers.get('content-type') ?? 'application/json');
            res.setHeader('x-sera-proxy', 'summit');
            res.end(responseText);
            evidence.recordExchange(forwardedBody, responseText, POLICY_DECISION_ID);
        }
        catch (error) {
            res.writeHead(502, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'Upstream request failed' }));
        }
    });
    await new Promise((resolve) => {
        server.listen(config.port, () => resolve());
    });
    return server;
}
function buildUpstreamHeaders(config) {
    const headers = {
        'content-type': 'application/json',
    };
    if (config.apiKey) {
        headers.authorization = `Bearer ${config.apiKey}`;
    }
    return headers;
}
async function readRequestBody(req, maxBytes) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += bufferChunk.length;
        if (total > maxBytes) {
            throw new Error('payload too large');
        }
        chunks.push(bufferChunk);
    }
    return Buffer.concat(chunks);
}
