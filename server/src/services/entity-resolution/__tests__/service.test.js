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
const service_js_1 = require("../service.js");
const ledger_js_1 = require("../../../provenance/ledger.js");
const neo4jModule = __importStar(require("../../../graph/neo4j.js"));
// Mocks
globals_1.jest.mock('../../../provenance/ledger', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue({})
    }
}));
(0, globals_1.describe)('EntityResolutionService', () => {
    let service;
    let mockRun;
    let mockSession;
    let mockDriver;
    (0, globals_1.beforeEach)(() => {
        service = new service_js_1.EntityResolutionService();
        globals_1.jest.clearAllMocks();
        mockRun = globals_1.jest.fn().mockResolvedValue({ records: [] });
        mockSession = {
            run: mockRun,
            close: globals_1.jest.fn().mockResolvedValue(undefined),
            executeWrite: globals_1.jest.fn().mockImplementation(async (cb) => {
                return cb({ run: mockRun });
            }),
        };
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
        };
        globals_1.jest.spyOn(neo4jModule, 'getDriver').mockReturnValue(mockDriver);
    });
    (0, globals_1.it)('should identify a merge candidate', async () => {
        const input = {
            id: 'source-1',
            type: 'Person',
            properties: { name: 'John Doe', email: 'john@example.com' },
            tenantId: 't1'
        };
        // Mock findCandidates to return a high-scoring match
        const session = mockDriver.session();
        mockRun.mockResolvedValueOnce({
            records: [{
                    get: (key) => {
                        if (key === 'properties')
                            return { name: 'John Doe', email: 'john@example.com' };
                        if (key === 'id')
                            return 'target-1';
                        return null;
                    }
                }]
        });
        const decisions = await service.resolveBatch([input]);
        (0, globals_1.expect)(decisions.length).toBe(1);
        (0, globals_1.expect)(decisions[0].decision).toBe('MERGE');
        (0, globals_1.expect)(decisions[0].candidate.targetEntityId).toBe('target-1');
    });
    (0, globals_1.it)('should execute a merge and log provenance', async () => {
        const decision = {
            candidate: {
                sourceEntityId: 's1',
                targetEntityId: 't1',
                overallScore: 0.98,
                features: [],
                reasons: []
            },
            decision: 'MERGE',
            confidence: 0.98
        };
        await service.applyDecision(decision, 'tenant-1', 'user-1');
        (0, globals_1.expect)(ledger_js_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'ENTITY_MERGE',
            resourceId: 't1',
            payload: globals_1.expect.objectContaining({ sourceId: 's1', targetId: 't1' })
        }));
    });
});
