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
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const CyberDeceptionService_js_1 = require("../src/services/CyberDeceptionService.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Cyber Deception Platform', () => {
    let app;
    let createApp;
    (0, globals_1.beforeAll)(async () => {
        ({ createApp } = await Promise.resolve().then(() => __importStar(require('../src/app.js'))));
        app = await createApp();
    });
    // Helper to get service instance
    const getService = () => CyberDeceptionService_js_1.CyberDeceptionService.getInstance();
    (0, globals_1.it)('should register a new honeypot', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/deception/honeypots')
            .send({
            name: 'test-honeypot-1',
            type: 'SSH',
            location: 'us-east-1'
        });
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)(res.body).toHaveProperty('id');
        (0, globals_1.expect)(res.body.config.name).toBe('test-honeypot-1');
        (0, globals_1.expect)(getService().getHoneypot(res.body.id)).toBeDefined();
    });
    (0, globals_1.it)('should generate a honeytoken', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/deception/tokens')
            .send({
            type: 'API_KEY',
            context: 'github-repo-leak'
        });
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)(res.body).toHaveProperty('tokenValue');
        (0, globals_1.expect)(res.body.tokenValue).toContain('sk-live-');
    });
    (0, globals_1.it)('should record an interaction event', async () => {
        // First create a honeypot
        const hpRes = await (0, supertest_1.default)(app)
            .post('/api/deception/honeypots')
            .send({ name: 'event-test-hp', type: 'HTTP', location: 'eu-west-1' });
        const honeypotId = hpRes.body.id;
        // Trigger event
        const eventRes = await (0, supertest_1.default)(app)
            .post('/api/deception/events')
            .send({
            type: 'HONEYPOT_TRIGGER',
            targetId: honeypotId,
            sourceIp: '192.168.1.100',
            metadata: {
                userAgent: 'Mozilla/5.0',
                duration: 120 // 2 minutes
            }
        });
        (0, globals_1.expect)(eventRes.status).toBe(201);
        (0, globals_1.expect)(eventRes.body.type).toBe('HONEYPOT_TRIGGER');
        (0, globals_1.expect)(eventRes.body.sourceIp).toBe('192.168.1.100');
        // Check attribution
        (0, globals_1.expect)(eventRes.body.metadata.fingerprintScore).toBeDefined();
    });
    (0, globals_1.it)('should retrieve intelligence stats', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/deception/intelligence');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body).toHaveProperty('activeHoneypots');
        (0, globals_1.expect)(res.body.totalEvents).toBeGreaterThanOrEqual(1);
    });
});
