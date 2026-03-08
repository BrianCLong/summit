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
const crypto_1 = __importDefault(require("crypto"));
const globals_1 = require("@jest/globals");
const recordProvenanceEntry = globals_1.jest.fn(async () => 'mock-id');
let n8nHandler;
let recordSpy;
let ProvenanceLedgerServiceRef;
(0, globals_1.describe)('n8n webhook', () => {
    (0, globals_1.beforeAll)(async () => {
        try {
            process.env.N8N_SIGNING_SECRET = 'test-secret';
            globals_1.jest.resetModules();
            const { default: n8nRouter } = await Promise.resolve().then(() => __importStar(require('../src/routes/n8n.js')));
            const { ProvenanceLedgerService } = await Promise.resolve().then(() => __importStar(require('../src/services/provenance-ledger.js')));
            ProvenanceLedgerServiceRef = ProvenanceLedgerService;
            const routeLayer = n8nRouter.stack.find((layer) => layer.route?.path === '/webhooks/n8n');
            if (!routeLayer) {
                throw new Error('n8n route not registered');
            }
            const handlers = routeLayer.route.stack.map((layer) => layer.handle);
            n8nHandler = handlers[handlers.length - 1];
        }
        catch (error) {
            throw new Error(`n8n webhook test setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    (0, globals_1.afterAll)(() => {
        recordSpy?.mockRestore();
    });
    (0, globals_1.beforeEach)(() => {
        recordProvenanceEntry.mockReset();
        recordSpy = globals_1.jest
            .spyOn(ProvenanceLedgerServiceRef.prototype, 'recordProvenanceEntry')
            .mockImplementation(recordProvenanceEntry);
    });
    (0, globals_1.it)('rejects bad signature', async () => {
        const body = JSON.stringify({ runId: 'r1' });
        const req = {
            method: 'POST',
            url: '/webhooks/n8n',
            headers: { 'x-maestro-signature': 'bad' },
            header: (name) => req.headers[name.toLowerCase()],
            body: Buffer.from(body),
            ip: '127.0.0.1',
        };
        const res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
        };
        await n8nHandler?.(req, res);
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({ ok: false, error: 'bad signature' }));
    });
    (0, globals_1.it)('accepts good signature', async () => {
        const body = JSON.stringify({
            runId: 'run-123',
            artifact: 'n8n.json',
            content: { ok: true },
        });
        const sig = crypto_1.default
            .createHmac('sha256', 'test-secret')
            .update(body)
            .digest('hex');
        const req = {
            method: 'POST',
            url: '/webhooks/n8n',
            headers: { 'x-maestro-signature': sig },
            header: (name) => req.headers[name.toLowerCase()],
            body: Buffer.from(body),
            ip: '127.0.0.1',
        };
        const res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
        };
        await n8nHandler?.(req, res);
        (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ ok: true });
    });
});
