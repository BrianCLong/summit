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
const loadSemanticSearchService = async () => {
    globals_1.jest.unstable_mockModule('../../../src/services/SynonymService.js', () => ({
        synonymService: { expandQuery: (query) => query },
    }));
    const module = await Promise.resolve().then(() => __importStar(require('../../../src/services/SemanticSearchService.js')));
    return module.default;
};
(0, globals_1.describe)('SemanticSearchService', () => {
    (0, globals_1.it)('maps deprecated search results into legacy shape', async () => {
        const SemanticSearchService = await loadSemanticSearchService();
        const service = new SemanticSearchService({
            poolFactory: () => ({ query: globals_1.jest.fn(), connect: globals_1.jest.fn() }),
            embeddingService: { generateEmbedding: globals_1.jest.fn(async () => [0]) },
        });
        const createdAt = new Date('2024-01-01T00:00:00Z');
        globals_1.jest.spyOn(service, 'searchCases').mockResolvedValue([
            {
                id: '1',
                title: 'Case 1',
                score: 0.9,
                similarity: 0.9,
                status: 'open',
                created_at: createdAt,
            },
        ]);
        const results = await service.search('threat');
        (0, globals_1.expect)(results).toEqual([
            {
                id: '1',
                text: 'Case 1',
                score: 0.9,
                metadata: { status: 'open', date: createdAt },
            },
        ]);
    });
});
