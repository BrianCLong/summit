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
const policy_guard_js_1 = require("../services/graphrag/policy-guard.js");
const mockGetNeo4jDriver = globals_1.jest.fn();
let IntelGraphService;
(0, globals_1.describe)('Tenant isolation regressions', () => {
    const mockRun = globals_1.jest.fn();
    const mockSession = {
        run: mockRun,
        close: globals_1.jest.fn(),
    };
    const mockDriver = {
        session: globals_1.jest.fn(() => mockSession),
    };
    let service;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.resetModules();
        await globals_1.jest.unstable_mockModule('../config/database', () => ({
            getNeo4jDriver: mockGetNeo4jDriver,
        }));
        await globals_1.jest.unstable_mockModule('prom-client', () => {
            class Registry {
                clear = globals_1.jest.fn();
                getSingleMetric = globals_1.jest.fn(() => undefined);
            }
            return {
                Registry,
                collectDefaultMetrics: globals_1.jest.fn(() => ({ clear: globals_1.jest.fn() })),
                Counter: globals_1.jest.fn().mockImplementation(() => ({ inc: globals_1.jest.fn() })),
                Gauge: globals_1.jest.fn().mockImplementation(() => ({ set: globals_1.jest.fn() })),
                Histogram: globals_1.jest.fn().mockImplementation(() => ({
                    startTimer: globals_1.jest.fn(() => () => { }),
                    observe: globals_1.jest.fn(),
                })),
                register: {
                    getSingleMetric: globals_1.jest.fn(() => undefined),
                    registerMetric: globals_1.jest.fn(),
                    clear: globals_1.jest.fn(),
                },
            };
        });
        ({ IntelGraphService } = await Promise.resolve().then(() => __importStar(require('../services/IntelGraphService.js'))));
        globals_1.jest.clearAllMocks();
        IntelGraphService._resetForTesting();
        mockDriver.session = globals_1.jest.fn(() => mockSession);
        mockGetNeo4jDriver.mockReturnValue(mockDriver);
        service = IntelGraphService.getInstance();
        service.driver = mockDriver;
    });
    (0, globals_1.it)('rejects graph lookups across tenant boundaries', async () => {
        const tenantRequester = 'tenant-alpha';
        const foreignNodeId = 'node-owned-by-beta';
        mockRun.mockImplementation(async (cypher, params) => {
            (0, globals_1.expect)(cypher).toContain('tenantId');
            (0, globals_1.expect)(params?.tenantId).toBe(tenantRequester);
            (0, globals_1.expect)(params?.nodeId).toBe(foreignNodeId);
            return { records: [] };
        });
        const result = await service.getNodeById(tenantRequester, foreignNodeId);
        (0, globals_1.expect)(result).toBeUndefined();
        (0, globals_1.expect)(mockRun).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('enforces tenant predicates on node searches and returns only tenant-scoped results', async () => {
        const tenantId = 'tenant-zeta';
        const criteria = { name: 'Redacted Asset' };
        mockRun.mockImplementation(async (cypher, params) => {
            (0, globals_1.expect)(cypher).toContain('n.tenantId = $tenantId');
            (0, globals_1.expect)(cypher).not.toMatch(/tenant\s*=\s*['"]tenant-beta['"]/i);
            (0, globals_1.expect)(params?.tenantId).toBe(tenantId);
            return {
                records: [
                    { get: () => ({ properties: { id: 'node-1', tenantId, label: 'Entity' } }) },
                    { get: () => ({ properties: { id: 'node-2', tenantId, label: 'Entity' } }) },
                ],
            };
        });
        const results = await service.findSimilarNodes(tenantId, 'Entity', criteria, 10);
        (0, globals_1.expect)(results).toHaveLength(2);
        (0, globals_1.expect)(results.every((node) => node.tenantId === tenantId)).toBe(true);
        (0, globals_1.expect)(mockRun).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('filters evidence that belongs to another tenant', () => {
        const user = {
            userId: 'user-1',
            tenantId: 'tenant-b',
            roles: [],
            clearances: [],
        };
        const snippets = [
            {
                evidenceId: 'ev-cross-tenant',
                snippet: 'foreign evidence',
                score: 0.9,
                classification: 'CONFIDENTIAL',
                metadata: { tenantId: 'tenant-a' },
            },
        ];
        const engine = new policy_guard_js_1.DefaultPolicyEngine();
        const { allowed, filtered, filterReasons } = (0, policy_guard_js_1.filterEvidenceByPolicy)(snippets, user, engine);
        (0, globals_1.expect)(allowed).toHaveLength(0);
        (0, globals_1.expect)(filtered).toHaveLength(1);
        (0, globals_1.expect)(filterReasons.get('ev-cross-tenant')).toBeDefined();
        (0, globals_1.expect)(filterReasons.get('ev-cross-tenant')).not.toMatch(/tenant-a/);
    });
    (0, globals_1.it)('denies claim visibility across tenants with a generic reason', () => {
        const engine = new policy_guard_js_1.DefaultPolicyEngine();
        const user = {
            userId: 'reviewer',
            tenantId: 'tenant-alpha',
            roles: [],
            clearances: [],
        };
        const decision = engine.canViewClaim({
            user,
            claimId: 'claim-1',
            metadata: { tenantId: 'tenant-beta', classification: 'PUBLIC' },
        });
        (0, globals_1.expect)(decision.allow).toBe(false);
        (0, globals_1.expect)(decision.reason).toMatch(/different tenant/i);
        (0, globals_1.expect)(decision.reason).not.toContain('tenant-beta');
    });
    (0, globals_1.it)('removes cross-tenant evidence from graph context responses', () => {
        const engine = new policy_guard_js_1.DefaultPolicyEngine();
        const user = {
            userId: 'user-2',
            tenantId: 'tenant-alpha',
            roles: [],
            clearances: [],
        };
        const context = {
            nodes: [
                { id: 'n1', label: 'Entity', properties: { tenantId: 'tenant-alpha' } },
                { id: 'n2', label: 'Entity', properties: { tenantId: 'tenant-beta' } },
            ],
            edges: [],
            evidenceSnippets: [
                {
                    evidenceId: 'ev-same-tenant',
                    snippet: 'local evidence',
                    score: 0.8,
                    classification: 'PUBLIC',
                    metadata: { tenantId: 'tenant-alpha' },
                },
                {
                    evidenceId: 'ev-foreign',
                    snippet: 'other tenant evidence',
                    score: 0.7,
                    classification: 'PUBLIC',
                    metadata: { tenantId: 'tenant-beta' },
                },
            ],
        };
        const { filteredContext, policyDecisions } = (0, policy_guard_js_1.applyPolicyToContext)(context, user, engine);
        (0, globals_1.expect)(filteredContext.evidenceSnippets).toHaveLength(1);
        (0, globals_1.expect)(filteredContext.evidenceSnippets[0].evidenceId).toBe('ev-same-tenant');
        (0, globals_1.expect)(policyDecisions.allowedEvidenceCount).toBe(1);
        (0, globals_1.expect)(policyDecisions.filteredEvidenceCount).toBe(1);
    });
});
