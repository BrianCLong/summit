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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const os_1 = require("os");
const config_js_1 = require("../src/sera-proxy/config.js");
const proxy_js_1 = require("../src/sera-proxy/proxy.js");
describe('SERA proxy', () => {
    it('forwards requests with Authorization header and model override', async () => {
        let capturedAuth;
        let capturedBody;
        const upstream = http.createServer((req, res) => {
            capturedAuth = req.headers.authorization;
            const chunks = [];
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            req.on('end', () => {
                const bodyText = Buffer.concat(chunks).toString('utf8');
                capturedBody = JSON.parse(bodyText);
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ id: 'ok', choices: [] }));
            });
        });
        await new Promise((resolve) => upstream.listen(0, resolve));
        const upstreamPort = upstream.address().port;
        const artifactDir = path.join((0, os_1.tmpdir)(), `sera-proxy-${Math.random().toString(16).slice(2)}`);
        const config = (0, config_js_1.resolveSeraProxyConfig)({
            endpoint: `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
            apiKey: 'dummy',
            model: 'allenai/SERA-8B',
            port: 0,
            allowHosts: ['127.0.0.1'],
            artifactDir,
        });
        const proxy = await (0, proxy_js_1.startSeraProxy)(config);
        const proxyPort = proxy.address().port;
        const response = await fetch(`http://127.0.0.1:${proxyPort}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ model: 'other', messages: [] }),
        });
        expect(response.status).toBe(200);
        await response.json();
        expect(capturedAuth).toBe('Bearer dummy');
        expect(capturedBody?.model).toBe('allenai/SERA-8B');
        const stamp = JSON.parse(fs.readFileSync(path.join(artifactDir, 'stamp.json'), 'utf8'));
        expect(Object.keys(stamp).sort()).toEqual(['metricsSha256', 'reportSha256']);
        proxy.close();
        upstream.close();
    });
    it('prefers CLI overrides over environment variables', () => {
        const config = (0, config_js_1.resolveSeraProxyConfig)({
            endpoint: 'http://localhost:8000/v1/chat/completions',
            apiKey: 'override',
            allowHosts: ['localhost'],
        }, {
            SERA_ENDPOINT: 'http://localhost:9000/v1/chat/completions',
            SERA_API_KEY: 'env',
        });
        expect(config.endpoint).toBe('http://localhost:8000/v1/chat/completions');
        expect(config.apiKey).toBe('override');
    });
});
