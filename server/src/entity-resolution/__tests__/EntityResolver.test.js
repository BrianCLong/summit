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
const mockGetInstance = globals_1.jest.fn();
const mockAppendEntry = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../services/IntelGraphService', () => ({
    IntelGraphService: {
        getInstance: mockGetInstance,
    },
}));
globals_1.jest.unstable_mockModule('../../provenance/ledger', () => ({
    provenanceLedger: {
        appendEntry: mockAppendEntry,
    },
}));
const { EntityResolver } = await Promise.resolve().then(() => __importStar(require('../engine/EntityResolver.js')));
const { IntelGraphService } = await Promise.resolve().then(() => __importStar(require('../../services/IntelGraphService.js')));
const { provenanceLedger } = await Promise.resolve().then(() => __importStar(require('../../provenance/ledger.js')));
(0, globals_1.describe)('EntityResolver', () => {
    let resolver;
    let mockGraphService;
    (0, globals_1.beforeEach)(() => {
        // Reset mocks
        globals_1.jest.clearAllMocks();
        mockGraphService = {
            getNodeById: globals_1.jest.fn(),
            searchNodes: globals_1.jest.fn(),
            findSimilarNodes: globals_1.jest.fn(),
            ensureNode: globals_1.jest.fn(),
            createEdge: globals_1.jest.fn(),
        };
        IntelGraphService.getInstance.mockReturnValue(mockGraphService);
        const stubModel = {
            predict: globals_1.jest.fn().mockResolvedValue({
                score: 0.95,
                confidence: 'high',
                explanation: 'mocked model',
                suggestedAction: 'auto_merge',
                features: [],
            }),
        };
        resolver = new EntityResolver(stubModel);
    });
    (0, globals_1.describe)('findDuplicates', () => {
        (0, globals_1.it)('should find duplicates based on threshold', async () => {
            // Add phone/address to bump score to high > 0.9
            // Name (0.4) + Email (0.2) + Phone (0.2) + Address (0.2)
            const entity = { id: '1', label: 'Person', name: 'John Doe', email: 'john@example.com', phone: '123', address: '123 St' };
            const candidate1 = { id: '2', label: 'Person', name: 'John Doe', email: 'john@example.com', phone: '123', address: '123 St' }; // high match
            const candidate2 = { id: '3', label: 'Person', name: 'Jane Smith', email: 'jane@example.com' }; // no match
            mockGraphService.getNodeById.mockResolvedValue(entity);
            mockGraphService.findSimilarNodes.mockResolvedValue([candidate1]);
            const results = await resolver.findDuplicates('tenant1', '1', 0.8);
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].matchCandidateId).toBe('2');
            (0, globals_1.expect)(results[0].confidence).toBe('high');
        });
    });
    (0, globals_1.describe)('merge', () => {
        (0, globals_1.it)('should merge entities and create provenance', async () => {
            const entityA = { id: '1', label: 'Person', name: 'John Doe', email: 'john@example.com', updatedAt: '2023-01-01' };
            const entityB = { id: '2', label: 'Person', name: 'Johnny Doe', phone: '123456', updatedAt: '2023-02-01' };
            mockGraphService.getNodeById.mockResolvedValueOnce(entityA).mockResolvedValueOnce(entityB);
            const result = await resolver.merge('tenant1', '1', '2', ['recency']);
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(mockGraphService.ensureNode).toHaveBeenCalled();
            const ensureCall = mockGraphService.ensureNode.mock.calls[0];
            const mergedProps = ensureCall[2];
            (0, globals_1.expect)(mergedProps.name).toBe('Johnny Doe');
            (0, globals_1.expect)(mergedProps.email).toBe('john@example.com');
            (0, globals_1.expect)(mergedProps.phone).toBe('123456');
            (0, globals_1.expect)(mockGraphService.createEdge).toHaveBeenCalledWith('tenant1', '2', '1', 'MERGED_INTO', globals_1.expect.any(Object));
            (0, globals_1.expect)(provenanceLedger.appendEntry).toHaveBeenCalled();
        });
    });
});
