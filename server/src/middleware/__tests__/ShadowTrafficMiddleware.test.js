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
const getPostgresPoolMock = globals_1.jest.fn();
const shadowMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: getPostgresPoolMock,
}));
globals_1.jest.unstable_mockModule('../../services/ShadowService.js', () => ({
    shadowService: {
        shadow: shadowMock,
    },
}));
(0, globals_1.describe)('ShadowTrafficMiddleware', () => {
    let clearShadowCache;
    let shadowTrafficMiddleware;
    let req;
    let res;
    let next;
    let queryMock;
    (0, globals_1.beforeAll)(async () => {
        ({ clearShadowCache, shadowTrafficMiddleware } = await Promise.resolve().then(() => __importStar(require('../ShadowTrafficMiddleware.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        queryMock = globals_1.jest.fn();
        getPostgresPoolMock.mockReturnValue({ query: queryMock });
        shadowMock.mockImplementation(globals_1.jest.fn());
        req = {
            method: 'POST',
            originalUrl: '/api/tasks',
            headers: { 'content-type': 'application/json' },
            body: { foo: 'bar' },
            user: { tenantId: 'tenant-1' },
        };
        res = {};
        next = globals_1.jest.fn();
        clearShadowCache('tenant-1');
    });
    (0, globals_1.it)('does not shadow when no DB config exists', async () => {
        queryMock.mockResolvedValueOnce({ rows: [] });
        await shadowTrafficMiddleware(req, res, next);
        (0, globals_1.expect)(queryMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT'), ['tenant-1']);
        (0, globals_1.expect)(shadowMock).not.toHaveBeenCalled();
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
    (0, globals_1.it)('shadows when config exists and sampling hits', async () => {
        globals_1.jest.spyOn(Math, 'random').mockReturnValue(0);
        queryMock.mockResolvedValueOnce({
            rows: [
                {
                    targetUrl: 'https://shadow.summit.io',
                    samplingRate: 1.0,
                    compareResponses: false,
                },
            ],
        });
        await shadowTrafficMiddleware(req, res, next);
        (0, globals_1.expect)(shadowMock).toHaveBeenCalledWith(globals_1.expect.objectContaining({ method: 'POST', url: '/api/tasks' }), globals_1.expect.objectContaining({ targetUrl: 'https://shadow.summit.io' }));
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
    (0, globals_1.it)('uses cache and avoids second DB query', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [
                {
                    targetUrl: 'https://shadow.summit.io',
                    samplingRate: 0.0,
                    compareResponses: false,
                },
            ],
        });
        await shadowTrafficMiddleware(req, res, next);
        await shadowTrafficMiddleware(req, res, next);
        (0, globals_1.expect)(queryMock).toHaveBeenCalledTimes(1);
    });
});
