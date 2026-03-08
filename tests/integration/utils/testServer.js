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
exports.createTestApp = createTestApp;
const http = __importStar(require("http"));
const url_1 = require("url");
// Create a simple HTTP server that mimics Express API for testing purposes
async function createTestApp() {
    // In-memory storage for flows
    const flows = {};
    let seq = 0;
    const server = http.createServer((req, res) => {
        const url = new url_1.URL(req.url || '/', `http://${req.headers.host}`);
        const path = url.pathname;
        const method = req.method || '';
        // Enable CORS and set content type
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Handle preflight requests
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            try {
                let parsedBody = {};
                if (body &&
                    (req.headers['content-type'] || '').includes('application/json')) {
                    parsedBody = JSON.parse(body);
                }
                // Handle POST /api/flows
                if (method === 'POST' && path === '/api/flows') {
                    const id = `f_${++seq}`;
                    const kind = parsedBody?.kind ?? 'maestro';
                    const rec = { id, kind, state: 'queued' };
                    flows[id] = rec;
                    res.writeHead(202);
                    res.end(JSON.stringify(rec));
                    return;
                }
                // Handle POST /__tick
                if (method === 'POST' && path === '/__tick') {
                    for (const id in flows) {
                        const rec = flows[id];
                        if (rec.state === 'queued')
                            rec.state = 'running';
                        else if (rec.state === 'running')
                            rec.state = 'complete';
                    }
                    res.writeHead(204);
                    res.end();
                    return;
                }
                // Handle GET /api/flows/:id
                if (method === 'GET' && path.startsWith('/api/flows/')) {
                    const id = path.split('/').pop() || ''; // Get the last part which should be the ID
                    const rec = flows[id];
                    if (!rec) {
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'not_found' }));
                        return;
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify(rec));
                    return;
                }
                // Handle GET /__health
                if (method === 'GET' && path === '/__health') {
                    res.writeHead(200);
                    res.end(JSON.stringify({ status: 'ok' }));
                    return;
                }
                // 404 for other routes
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'not found' }));
            }
            catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
    });
    return server;
}
