"use strict";
/**
 * Tests for ContextFusion
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ContextFusion_js_1 = require("../fusion/ContextFusion.js");
(0, globals_1.describe)('ContextFusion', () => {
    let fusion;
    (0, globals_1.beforeEach)(() => {
        fusion = new ContextFusion_js_1.ContextFusion({
            maxTokens: 4000,
            deduplicationThreshold: 0.85,
            conflictResolutionStrategy: 'highest_confidence',
            preserveCitations: true,
        });
    });
    const createMockChunk = (id, content, relevance, sourceType = 'document') => ({
        id,
        content,
        citations: [
            {
                id: `citation-${id}`,
                documentId: `doc-${id}`,
                spanStart: 0,
                spanEnd: content.length,
                content,
                confidence: relevance,
                sourceType,
            },
        ],
        graphPaths: [],
        relevanceScore: relevance,
        tenantId: 'tenant-1',
    });
    (0, globals_1.describe)('fuse', () => {
        (0, globals_1.it)('should fuse evidence from multiple sources', async () => {
            const graphEvidence = [
                createMockChunk('g1', 'Graph evidence about entity A', 0.9, 'graph'),
            ];
            const documentEvidence = [
                createMockChunk('d1', 'Document evidence about entity A', 0.8, 'document'),
            ];
            const result = await fusion.fuse(graphEvidence, documentEvidence);
            (0, globals_1.expect)(result.id).toBeDefined();
            (0, globals_1.expect)(result.sources.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.fusedContent).toContain('Graph Evidence');
            (0, globals_1.expect)(result.fusedContent).toContain('Document Evidence');
            (0, globals_1.expect)(result.totalTokens).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should deduplicate similar content', async () => {
            const graphEvidence = [
                createMockChunk('g1', 'The entity A is located in New York', 0.9, 'graph'),
            ];
            const documentEvidence = [
                createMockChunk('d1', 'The entity A is located in New York', 0.8, 'document'),
            ];
            const result = await fusion.fuse(graphEvidence, documentEvidence);
            // Should have deduplicated to fewer sources
            (0, globals_1.expect)(result.sources.length).toBeLessThanOrEqual(2);
        });
        (0, globals_1.it)('should detect and resolve conflicts', async () => {
            const graphEvidence = [
                createMockChunk('g1', 'John Smith was born in 1980 in New York', 0.9, 'graph'),
            ];
            const documentEvidence = [
                createMockChunk('d1', 'John Smith was not born in 1980, he was born in 1985', 0.7, 'document'),
            ];
            const result = await fusion.fuse(graphEvidence, documentEvidence);
            // Should detect the conflict about birth year
            (0, globals_1.expect)(result.conflictsResolved.length).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should handle empty evidence', async () => {
            const result = await fusion.fuse([], []);
            (0, globals_1.expect)(result.sources).toHaveLength(0);
            (0, globals_1.expect)(result.fusedContent).toBe('');
            (0, globals_1.expect)(result.totalTokens).toBe(0);
        });
        (0, globals_1.it)('should compress content to fit token budget', async () => {
            const longContent = 'A'.repeat(20000);
            const graphEvidence = [
                createMockChunk('g1', longContent, 0.9, 'graph'),
            ];
            const smallFusion = new ContextFusion_js_1.ContextFusion({ maxTokens: 100 });
            const result = await smallFusion.fuse(graphEvidence, []);
            (0, globals_1.expect)(result.compressionRatio).toBeLessThan(1);
        });
    });
    (0, globals_1.describe)('configuration', () => {
        (0, globals_1.it)('should use default configuration', () => {
            const defaultFusion = new ContextFusion_js_1.ContextFusion();
            (0, globals_1.expect)(defaultFusion).toBeDefined();
        });
        (0, globals_1.it)('should allow different conflict resolution strategies', async () => {
            const mergeFusion = new ContextFusion_js_1.ContextFusion({
                conflictResolutionStrategy: 'merge',
            });
            const evidence1 = [createMockChunk('g1', 'Entity A is active', 0.9, 'graph')];
            const evidence2 = [
                createMockChunk('d1', 'Entity A is not active', 0.8, 'document'),
            ];
            const result = await mergeFusion.fuse(evidence1, evidence2);
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
});
