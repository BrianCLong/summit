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
// Mock fetch
const mockFetch = globals_1.jest.fn();
// @ts-ignore
global.fetch = mockFetch;
// Mock dependencies relative to this test file
globals_1.jest.unstable_mockModule("../OSINTQueueService.js", () => ({
    osintQueue: {
        getJobCounts: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule("../../middleware/auth.js", () => ({
    ensureAuthenticated: (req, res, next) => next(),
}));
globals_1.jest.unstable_mockModule("../../middleware/osintRateLimiter.js", () => ({
    osintRateLimiter: (req, res, next) => next(),
}));
globals_1.jest.unstable_mockModule("../../db/postgres.js", () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule("../../../../packages/osint-collector/src/collectors/SimpleFeedCollector.js", () => ({
    SimpleFeedCollector: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule("../../../../packages/osint-collector/src/types/index.js", () => ({
    CollectionType: { WEB_SCRAPING: "WEB_SCRAPING" },
    TaskStatus: { PENDING: "PENDING" },
}));
globals_1.jest.unstable_mockModule("../../audit/security-audit-logger.js", () => ({
    securityAudit: {
        logDataImport: globals_1.jest.fn(),
        logSensitiveRead: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)("OSINT Routes Security", () => {
    let router;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ score: 0.1, summary: "Safe" }),
        });
        // Import router after mocks - dynamic import is key for unstable_mockModule
        const osintRouteModule = await Promise.resolve().then(() => __importStar(require("../../routes/osint.js")));
        router = osintRouteModule.default;
    });
    (0, globals_1.it)("should use safe prompt structure for risk assessment", async () => {
        // Setup request
        const req = {
            method: "POST",
            url: "/assess-risk",
            body: {
                iocs: [{ value: "1.2.3.4" }],
            },
            user: { tenantId: "test-tenant" },
            get: () => "test-agent",
            ip: "127.0.0.1",
        };
        const res = {
            json: globals_1.jest.fn(),
            status: globals_1.jest.fn().mockReturnThis(),
        };
        // Find handler
        // router is an express Router.
        // We need to find the layer that handles /assess-risk
        const handlerLayer = router.stack.find((layer) => layer.route && layer.route.path === "/assess-risk");
        if (!handlerLayer) {
            throw new Error("/assess-risk route not found in router stack");
        }
        // The route stack contains middlewares and the final handler.
        // ensureAuthenticated is first, the actual handler is likely last.
        const stack = handlerLayer.route.stack;
        const handler = stack[stack.length - 1].handle;
        // Set env var to enable LLM path
        process.env.LLM_ENDPOINT = "http://localhost:11434";
        await handler(req, res);
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        // Verify prompt structure - specific assertions for the fix
        (0, globals_1.expect)(body.prompt).toContain("Instructions:");
        (0, globals_1.expect)(body.prompt).toContain('"""');
        (0, globals_1.expect)(body.prompt).toContain("1.2.3.4");
        // Ensure delimiters surround the input
        (0, globals_1.expect)(body.prompt).toMatch(/"""\s*1\.2\.3\.4\s*"""/);
    });
});
