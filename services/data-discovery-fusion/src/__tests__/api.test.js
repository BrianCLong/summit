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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const express_1 = __importDefault(require("express"));
const routes_js_1 = require("../api/routes.js");
const DataDiscoveryFusionEngine_js_1 = require("../DataDiscoveryFusionEngine.js");
// Simple request helper for testing
async function request(app, method, path, body) {
    const http = await Promise.resolve().then(() => __importStar(require('http')));
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const address = server.address();
            const options = {
                hostname: 'localhost',
                port: address.port,
                path,
                method,
                headers: body ? { 'Content-Type': 'application/json' } : {},
            };
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    server.close();
                    try {
                        resolve({ status: res.statusCode || 500, body: data ? JSON.parse(data) : null });
                    }
                    catch {
                        resolve({ status: res.statusCode || 500, body: data });
                    }
                });
            });
            req.on('error', (e) => {
                server.close();
                reject(e);
            });
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    });
}
(0, vitest_1.describe)('API Routes', () => {
    let app;
    let engine;
    (0, vitest_1.beforeAll)(() => {
        engine = new DataDiscoveryFusionEngine_js_1.DataDiscoveryFusionEngine({
            enableAutoDiscovery: false,
            enableEventPublishing: false,
        });
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/v1', (0, routes_js_1.createRoutes)(engine));
    });
    (0, vitest_1.afterAll)(async () => {
        await engine.stop();
    });
    (0, vitest_1.describe)('GET /api/v1/health', () => {
        (0, vitest_1.it)('should return health status', async () => {
            const res = await request(app, 'GET', '/api/v1/health');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('status', 'healthy');
            (0, vitest_1.expect)(res.body).toHaveProperty('stats');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/sources', () => {
        (0, vitest_1.it)('should return empty sources list initially', async () => {
            const res = await request(app, 'GET', '/api/v1/sources');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('sources');
            (0, vitest_1.expect)(Array.isArray(res.body.sources)).toBe(true);
        });
    });
    (0, vitest_1.describe)('POST /api/v1/fuse', () => {
        (0, vitest_1.it)('should fuse records', async () => {
            const res = await request(app, 'POST', '/api/v1/fuse', {
                records: [
                    { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
                    { sourceId: 'src2', recordId: '2', data: { name: 'John', phone: '555-1234' } },
                ],
                matchFields: ['name'],
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('success', true);
            (0, vitest_1.expect)(res.body).toHaveProperty('results');
        });
    });
    (0, vitest_1.describe)('POST /api/v1/deduplicate', () => {
        (0, vitest_1.it)('should deduplicate records', async () => {
            const res = await request(app, 'POST', '/api/v1/deduplicate', {
                records: [
                    { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
                    { sourceId: 'src1', recordId: '2', data: { name: 'John', email: 'john@example.com' } },
                ],
                matchFields: ['name', 'email'],
            });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('success', true);
            (0, vitest_1.expect)(res.body).toHaveProperty('results');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/recipes', () => {
        (0, vitest_1.it)('should return automation recipes', async () => {
            const res = await request(app, 'GET', '/api/v1/recipes');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('recipes');
            (0, vitest_1.expect)(Array.isArray(res.body.recipes)).toBe(true);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/learning/stats', () => {
        (0, vitest_1.it)('should return learning statistics', async () => {
            const res = await request(app, 'GET', '/api/v1/learning/stats');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body).toHaveProperty('stats');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/fusion/:id (not found)', () => {
        (0, vitest_1.it)('should return 404 for non-existent fusion', async () => {
            const res = await request(app, 'GET', '/api/v1/fusion/non-existent-id');
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
