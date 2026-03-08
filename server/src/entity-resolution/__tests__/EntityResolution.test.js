"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityResolver_js_1 = require("../engine/EntityResolver.js");
const NaiveBayesModel_js_1 = require("../models/NaiveBayesModel.js");
const IntelGraphService_js_1 = require("../../services/IntelGraphService.js");
const globals_1 = require("@jest/globals");
// Mock dependencies
// We need to mock dependencies that have side effects or complex imports
globals_1.jest.mock('../../graph/neo4j', () => ({
    runCypher: globals_1.jest.fn()
}));
globals_1.jest.mock('../../services/IntelGraphService');
globals_1.jest.mock('../../provenance/ledger', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue(true)
    }
}));
describe('EntityResolver with NaiveBayesModel', () => {
    let resolver;
    let mockGraphService;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        // Setup GraphService Mock
        mockGraphService = {
            getNodeById: globals_1.jest.fn(),
            findSimilarNodes: globals_1.jest.fn(),
            ensureNode: globals_1.jest.fn(),
            createEdge: globals_1.jest.fn(),
        };
        // @ts-ignore
        IntelGraphService_js_1.IntelGraphService.getInstance = globals_1.jest.fn(() => mockGraphService);
        resolver = new EntityResolver_js_1.EntityResolver(new NaiveBayesModel_js_1.NaiveBayesModel());
    });
    describe('findDuplicates', () => {
        it('should identify a high confidence duplicate based on strong signals', async () => {
            const target = {
                id: 't1',
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '555-0100',
                label: 'Person'
            };
            const candidate = {
                id: 'c1',
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '555-0100',
                label: 'Person'
            };
            mockGraphService.getNodeById.mockResolvedValue(target);
            mockGraphService.findSimilarNodes.mockResolvedValue([candidate]);
            const results = await resolver.findDuplicates('tenant-1', 't1');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchCandidateId).toBe('c1');
            expect(results[0].confidence).toBe('high');
            expect(results[0].suggestedAction).toBe('auto_merge');
        });
        it('should identify a medium confidence duplicate with partial match', async () => {
            const target = {
                id: 't1',
                name: 'Johnathan Doe',
                email: 'j.doe@example.com',
                label: 'Person'
            };
            const candidate = {
                id: 'c2',
                name: 'John Doe',
                email: 'j.doe@example.com', // Email matches
                label: 'Person'
            };
            mockGraphService.getNodeById.mockResolvedValue(target);
            mockGraphService.findSimilarNodes.mockResolvedValue([candidate]);
            const results = await resolver.findDuplicates('tenant-1', 't1');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchCandidateId).toBe('c2');
            // Email match is strong (weight 5), name is fuzzy. Should be high or medium.
            // LogOdds starts at -4.6. Email +5 -> 0.4. Name fuzzy maybe +1.5 -> 1.9.
            // 1.9 LogOdds is > 85% prob.
            expect(['high', 'medium']).toContain(results[0].confidence);
        });
        it('should reject low similarity candidates', async () => {
            const target = {
                id: 't1',
                name: 'John Doe',
                email: 'john@example.com',
                label: 'Person'
            };
            const candidate = {
                id: 'c3',
                name: 'Jane Smith',
                email: 'jane@example.com',
                label: 'Person'
            };
            mockGraphService.getNodeById.mockResolvedValue(target);
            mockGraphService.findSimilarNodes.mockResolvedValue([candidate]);
            const results = await resolver.findDuplicates('tenant-1', 't1');
            // Should filter out if below threshold (default 0.7 which is high)
            // NB Model returns low prob for this.
            expect(results.length).toBe(0);
        });
    });
    describe('NaiveBayesModel logic', () => {
        const model = new NaiveBayesModel_js_1.NaiveBayesModel();
        it('should return high score for identical entities', async () => {
            const features = {
                name_levenshtein: 1,
                name_jaro_winkler: 1,
                name_token_jaccard: 1,
                name_soundex_match: 1,
                name_metaphone_match: 1,
                address_cosine: 1,
                phone_match: 1,
                email_match: 1,
                date_similarity: 1
            };
            const result = await model.predict(features);
            expect(result.score).toBeGreaterThan(0.95);
            expect(result.suggestedAction).toBe('auto_merge');
        });
        it('should return low score for mismatches', async () => {
            const features = {
                name_levenshtein: 0.2,
                name_jaro_winkler: 0.2,
                name_token_jaccard: 0,
                name_soundex_match: 0,
                name_metaphone_match: 0,
                address_cosine: 0,
                phone_match: 0,
                email_match: 0, // Mismatch penalizes
                date_similarity: 0
            };
            const result = await model.predict(features);
            expect(result.score).toBeLessThan(0.1);
        });
    });
});
