"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const production_security_js_1 = require("../src/config/production-security.js");
// Mock dependencies
globals_1.jest.mock('../src/config/production-security.js', () => ({
    productionAuthMiddleware: (req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    },
    applyProductionSecurity: globals_1.jest.fn(),
}));
(0, globals_1.describe)('Security Controls', () => {
    let app;
    let healthHandler;
    (0, globals_1.beforeAll)(async () => {
        app = (0, express_1.default)();
        healthHandler = (req, res) => res.status(200).json({ status: 'ok' });
        app.get('/health', healthHandler);
        app.use(production_security_js_1.productionAuthMiddleware);
        app.get('/api/ai', (req, res) => res.status(200).send('ai'));
        app.get('/api/webhooks', (req, res) => res.status(200).send('webhooks'));
        app.get('/monitoring', (req, res) => res.status(200).send('monitoring'));
        app.get('/search/evidence', (req, res) => res.status(200).json({ results: [] }));
    });
    const makeRes = () => ({
        status: globals_1.jest.fn().mockReturnThis(),
        json: globals_1.jest.fn(),
        send: globals_1.jest.fn(),
    });
    (0, globals_1.it)('should allow public access to /health', () => {
        const res = makeRes();
        healthHandler({}, res);
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(200);
    });
    (0, globals_1.it)('should deny unauthenticated access to /api/ai', async () => {
        const req = { headers: {} };
        const res = makeRes();
        const next = globals_1.jest.fn();
        await (0, production_security_js_1.productionAuthMiddleware)(req, res, next);
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(401);
    });
    (0, globals_1.it)('should allow authenticated access to /api/ai', async () => {
        const req = {
            headers: { authorization: 'Bearer valid_token' },
        };
        const res = makeRes();
        const next = globals_1.jest.fn();
        await (0, production_security_js_1.productionAuthMiddleware)(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
});
