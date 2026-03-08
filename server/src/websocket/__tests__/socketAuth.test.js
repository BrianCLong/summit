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
const globals_1 = require("@jest/globals");
const mockQuery = globals_1.jest.fn();
// Mocks
globals_1.jest.unstable_mockModule('../connectionManager.js', () => ({
    WebSocketConnectionPool: globals_1.jest.fn().mockImplementation(() => ({
        registerConnection: globals_1.jest.fn(),
        removeConnection: globals_1.jest.fn(),
        handleServerRestart: globals_1.jest.fn(),
        getStats: globals_1.jest.fn().mockReturnValue({ connections: [] }),
        closeIdleConnections: globals_1.jest.fn().mockReturnValue([])
    })),
    ManagedConnection: globals_1.jest.fn()
}));
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: mockQuery
    }))
}));
globals_1.jest.unstable_mockModule('../../middleware/observability/otel-tracing.js', () => ({
    otelService: {
        createSpan: globals_1.jest.fn().mockReturnValue({
            addSpanAttributes: globals_1.jest.fn(),
            end: globals_1.jest.fn()
        })
    }
}));
globals_1.jest.unstable_mockModule('../../observability/metrics.js', () => ({
    activeConnections: {
        inc: globals_1.jest.fn(),
        dec: globals_1.jest.fn()
    }
}));
globals_1.jest.unstable_mockModule('../../yjs/YjsHandler.js', () => ({
    YjsHandler: globals_1.jest.fn()
}));
(0, globals_1.describe)('WebSocket Authorization', () => {
    let WebSocketCore;
    let core;
    const ORIGINAL_ENV = process.env.NODE_ENV;
    (0, globals_1.beforeAll)(async () => {
        process.env.NODE_ENV = 'test';
        ({ WebSocketCore } = await Promise.resolve().then(() => __importStar(require('../core.js'))));
    });
    (0, globals_1.afterAll)(() => {
        process.env.NODE_ENV = ORIGINAL_ENV;
    });
    (0, globals_1.beforeEach)(() => {
        mockQuery.mockReset();
        mockQuery.mockResolvedValue({ rowCount: 0 }); // Default Deny
        core = Object.create(WebSocketCore.prototype);
        core.checkInvestigationAccess = globals_1.jest.fn(async () => false);
    });
    (0, globals_1.it)('should deny subscription to investigation if unauthorized', async () => {
        const claims = {
            tenantId: 't1',
            userId: 'unauthorized_user',
            roles: [],
            permissions: [],
            sub: 'unauthorized_user',
            exp: 9999999999
        };
        const message = {
            type: 'subscribe',
            topics: ['investigation:123']
        };
        const allowed = await core.opaAllow(claims, message);
        (0, globals_1.expect)(allowed).toBe(false);
        (0, globals_1.expect)(core.checkInvestigationAccess).toHaveBeenCalled();
    });
    (0, globals_1.it)('should allow subscription to investigation if authorized', async () => {
        core.checkInvestigationAccess = globals_1.jest.fn(async () => true);
        const claims = {
            tenantId: 't1',
            userId: 'valid_user',
            roles: [],
            permissions: [],
            sub: 'valid_user',
            exp: 9999999999
        };
        const message = {
            type: 'subscribe',
            topics: ['investigation:123']
        };
        const allowed = await core.opaAllow(claims, message);
        (0, globals_1.expect)(allowed).toBe(true);
        (0, globals_1.expect)(core.checkInvestigationAccess).toHaveBeenCalled();
    });
    (0, globals_1.it)('should deny empty topics', async () => {
        const claims = { tenantId: 't1', userId: 'u1', roles: [], permissions: [], sub: 'u1', exp: 9999999999 };
        const message = { type: 'subscribe', topics: [] };
        const allowed = await core.opaAllow(claims, message);
        (0, globals_1.expect)(allowed).toBe(false);
    });
    (0, globals_1.it)('should allow generic topics that do not start with investigation:', async () => {
        const claims = { tenantId: 't1', userId: 'u1', roles: [], permissions: [], sub: 'u1', exp: 9999999999 };
        const message = { type: 'subscribe', topics: ['some.other.topic'] };
        const allowed = await core.opaAllow(claims, message);
        (0, globals_1.expect)(allowed).toBe(true);
    });
});
