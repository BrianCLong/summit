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
const getNeo4jDriverMock = globals_1.jest.fn();
const appendEntryMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getNeo4jDriver: getNeo4jDriverMock,
}));
globals_1.jest.unstable_mockModule('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: appendEntryMock,
    },
    ProvenanceLedgerV2: class ProvenanceLedgerV2 {
    },
}));
(0, globals_1.describe)('IntelGraphService', () => {
    let IntelGraphService;
    let mockSession;
    let service;
    (0, globals_1.beforeAll)(async () => {
        ({ IntelGraphService } = await Promise.resolve().then(() => __importStar(require('../IntelGraphService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockSession = {
            run: globals_1.jest.fn((query) => {
                if (query.includes('CREATE (c:Claim')) {
                    return {
                        records: [{ get: () => ({ properties: { id: 'claim-1' } }) }],
                    };
                }
                return {
                    records: [{ get: () => ({ properties: { id: 'decision-1' } }) }],
                };
            }),
            close: globals_1.jest.fn(),
        };
        getNeo4jDriverMock.mockReturnValue({
            session: globals_1.jest.fn(() => mockSession),
        });
        appendEntryMock.mockResolvedValue({ id: 'ledger-123', currentHash: 'hash-abc' });
        IntelGraphService._resetForTesting();
        service = IntelGraphService.getInstance();
    });
    (0, globals_1.describe)('createDecision', () => {
        (0, globals_1.it)('should create a decision node, link claims, and log to ledger', async () => {
            const decisionData = {
                question: 'Approve request?',
                recommendation: 'Approve',
                rationale: 'Looks good',
            };
            const claimIds = ['claim-1', 'claim-2'];
            const result = await service.createDecision(decisionData, claimIds, 'user-1', 'tenant-1');
            (0, globals_1.expect)(appendEntryMock).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                tenantId: 'tenant-1',
                actionType: 'CREATE',
                resourceType: 'Decision',
                payload: globals_1.expect.objectContaining({
                    question: 'Approve request?',
                    recommendation: 'Approve',
                    informedByClaimIds: claimIds,
                }),
            }));
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE (d:Decision $props)'), globals_1.expect.objectContaining({
                tenantId: 'tenant-1',
                informedByClaimIds: claimIds,
            }));
            (0, globals_1.expect)(result).toEqual(globals_1.expect.objectContaining({
                id: 'decision-1',
            }));
        });
        (0, globals_1.it)('should complete within 300ms (performance check)', async () => {
            const start = Date.now();
            await service.createDecision({
                question: 'Perf test?',
                recommendation: 'Proceed',
                rationale: 'Perf test',
            }, [], 'u1', 't1');
            const duration = Date.now() - start;
            (0, globals_1.expect)(duration).toBeLessThan(300);
        });
    });
    (0, globals_1.describe)('createClaim', () => {
        (0, globals_1.it)('should create a claim node and log to ledger', async () => {
            const result = await service.createClaim({
                statement: 'Claim text',
                confidence: 0.9,
                entityId: '11111111-1111-1111-1111-111111111111',
            }, 'user-1', 'tenant-1');
            (0, globals_1.expect)(appendEntryMock).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                actionType: 'CREATE',
                resourceType: 'Claim',
            }));
            const createCall = mockSession.run.mock.calls.find((call) => call[0].includes('CREATE (c:Claim'));
            (0, globals_1.expect)(createCall).toBeDefined();
            (0, globals_1.expect)(result).toEqual(globals_1.expect.objectContaining({
                id: 'claim-1',
            }));
        });
    });
});
