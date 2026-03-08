"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const httpBridge_js_1 = require("../src/integration/httpBridge.js");
let server;
const port = 4100;
const persisted = [];
beforeAll(() => {
    jest.useRealTimers();
    server = (0, httpBridge_js_1.startHttpBridge)({
        port,
        onPersist: async (payload) => {
            persisted.push(payload);
        }
    });
});
afterAll(() => {
    server.close();
});
describe('HTTP bridge integration', () => {
    it('accepts POST payloads and persists them', async () => {
        const payload = JSON.stringify({ reading: 21, unit: 'C' });
        await new Promise((resolve, reject) => {
            const req = node_http_1.default.request({
                hostname: '127.0.0.1',
                port,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    if (res.statusCode === 202) {
                        resolve();
                    }
                    else {
                        reject(new Error(`unexpected status ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
        expect(persisted).toHaveLength(1);
        expect(persisted[0]).toMatchObject({ reading: 21, unit: 'C' });
        const health = await fetch(`http://127.0.0.1:${port}/health`);
        expect(health.status).toBe(200);
    });
    it('returns method not allowed for unsupported verbs', async () => {
        const res = await fetch(`http://127.0.0.1:${port}`, { method: 'GET' });
        expect(res.status).toBe(405);
    });
    it('reports degraded health when diagnostics contain failures', async () => {
        const failurePort = port + 1;
        const failingServer = (0, httpBridge_js_1.startHttpBridge)({
            port: failurePort,
            onPersist: () => {
                throw new Error('persist failed');
            }
        });
        try {
            await fetch(`http://127.0.0.1:${failurePort}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reading: 1 })
            });
            const health = await fetch(`http://127.0.0.1:${failurePort}/health`);
            expect(health.status).toBe(503);
        }
        finally {
            failingServer.close();
        }
    });
});
