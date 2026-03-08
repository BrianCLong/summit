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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../index.js");
let nlGraphQueryRouter;
globals_1.jest.mock('../index.js', () => ({
    getNlGraphQueryService: globals_1.jest.fn(),
}));
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('nl-graph-query routes', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    (0, globals_1.beforeAll)(async () => {
        nlGraphQueryRouter = (await Promise.resolve().then(() => __importStar(require('@/routes/nl-graph-query')))).default;
        app.use('/', nlGraphQueryRouter);
    });
    const compile = globals_1.jest.fn();
    (0, globals_1.beforeEach)(() => {
        compile.mockReset();
        index_js_1.getNlGraphQueryService.mockReturnValue({ compile });
    });
    (0, globals_1.it)('returns explanation payload and metadata on successful compile', async () => {
        compile.mockResolvedValue({
            cypher: 'MATCH (p:Person)-[:ASSOCIATED_WITH]->(o:Organization) RETURN p, o LIMIT 5',
            explanationDetails: {
                summary: 'Finds patterns matching multiple graph structures',
                rationale: ['r1'],
                evidence: [{ source: 'MATCH clause', snippet: 'MATCH (p)', reason: 'core pattern' }],
                confidence: 0.88,
            },
            estimatedCost: {
                nodesScanned: 1,
                edgesScanned: 1,
                costClass: 'low',
                estimatedTimeMs: 1,
                estimatedMemoryMb: 1,
                costDrivers: [],
            },
            explanation: 'Explained',
            queryId: 'abc',
            warnings: [],
            requiredParameters: [],
            isSafe: true,
            timestamp: new Date(),
        });
        const response = await (0, supertest_1.default)(app).post('/compile').send({
            prompt: 'find people',
            schemaContext: { tenantId: 't1', userId: 'u1' },
            verbose: true,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.explanationDetails.confidence).toBe(0.88);
        (0, globals_1.expect)(response.body.metadata.explanation).toEqual({ confidence: 0.88, evidenceCount: 1 });
        (0, globals_1.expect)(response.body.metadata.service).toBe('nl-graph-query-copilot');
        (0, globals_1.expect)(compile).toHaveBeenCalledWith(globals_1.expect.objectContaining({ prompt: 'find people', verbose: true }));
    });
    (0, globals_1.it)('bubbles compile errors without explanation metadata', async () => {
        compile.mockResolvedValue({
            code: 'INVALID_INPUT',
            message: 'invalid',
            suggestions: [],
            originalPrompt: 'bad',
        });
        const response = await (0, supertest_1.default)(app).post('/compile').send({
            prompt: 'bad',
            schemaContext: { tenantId: 't1', userId: 'u1' },
        });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body.code).toBe('INVALID_INPUT');
        (0, globals_1.expect)(response.body.metadata).toBeUndefined();
    });
});
