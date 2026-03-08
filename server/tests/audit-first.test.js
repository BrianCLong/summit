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
// @ts-ignore
const globals_1 = require("@jest/globals");
const express_1 = require("@jest-mock/express");
globals_1.jest.mock('../src/provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue({}),
    },
}));
globals_1.jest.mock('../src/config/logger.js', () => ({
    __esModule: true,
    default: {
        child: () => ({
            debug: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
        }),
    },
}));
let auditFirstMiddleware;
let provenanceLedger;
(0, globals_1.describe)('AuditFirstMiddleware', () => {
    (0, globals_1.beforeAll)(async () => {
        ({ auditFirstMiddleware } = await Promise.resolve().then(() => __importStar(require('../src/middleware/audit-first.js'))));
        ({ provenanceLedger } = await Promise.resolve().then(() => __importStar(require('../src/provenance/ledger.js'))));
    });
    (0, globals_1.it)('should call next for non-sensitive routes', () => {
        const req = (0, express_1.getMockReq)({ method: 'GET', path: '/public' });
        const { res, next } = (0, express_1.getMockRes)();
        auditFirstMiddleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(provenanceLedger.appendEntry).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should stamp sensitive routes', async () => {
        const req = (0, express_1.getMockReq)({
            method: 'POST',
            path: '/auth/login',
            body: { username: 'test' }
        });
        const { res, next } = (0, express_1.getMockRes)();
        auditFirstMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(([event]) => event === 'finish')?.[1];
        finishHandler?.();
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'API_POST',
            resourceId: '/auth/login',
        }));
    });
    (0, globals_1.it)('should stamp sensitive GET routes', async () => {
        const req = (0, express_1.getMockReq)({
            method: 'GET',
            path: '/api/provenance/history',
        });
        const { res, next } = (0, express_1.getMockRes)();
        auditFirstMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(([event]) => event === 'finish')?.[1];
        finishHandler?.();
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'API_GET',
            resourceId: '/api/provenance/history',
        }));
    });
});
