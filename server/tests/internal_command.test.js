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
const express_1 = __importDefault(require("express"));
// Use unstable_mockModule for ESM mocking
globals_1.jest.unstable_mockModule('../src/middleware/auth.js', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { id: 'test', role: 'admin' };
        next();
    },
    ensureRole: () => (req, res, next) => next(),
}));
(0, globals_1.describe)('Internal Command Dashboard Endpoints', () => {
    let app;
    let internalCommandRouter;
    (0, globals_1.beforeEach)(async () => {
        // Dynamic import to ensure mock is used
        const module = await Promise.resolve().then(() => __importStar(require('../src/routes/internal-command.js')));
        internalCommandRouter = module.default;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/internal', internalCommandRouter);
    });
    const endpoints = [
        'governance',
        'agents',
        'ci',
        'releases',
        'zk',
        'streaming',
        'ga'
    ];
    endpoints.forEach(endpoint => {
        (0, globals_1.it)(`should return status for ${endpoint}`, async () => {
            const res = await (0, supertest_1.default)(app).get(`/api/internal/${endpoint}/status`);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body).toHaveProperty('status');
            (0, globals_1.expect)(res.body).toHaveProperty('details');
            const status = res.body.status;
            (0, globals_1.expect)(['green', 'yellow', 'red'].includes(status)).toBe(true);
        });
    });
});
