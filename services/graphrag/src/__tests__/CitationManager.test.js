"use strict";
/**
 * Tests for CitationManager
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CitationManager_js_1 = require("../citation/CitationManager.js");
// Mock Neo4j driver
const mockSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: globals_1.jest.fn(() => mockSession),
};
(0, globals_1.describe)('CitationManager', () => {
    let citationManager;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        citationManager = new CitationManager_js_1.CitationManager(mockDriver);
    });
    (0, globals_1.describe)('createCitation', () => {
        (0, globals_1.it)('should create a citation linking entity to document', async () => {
            mockSession.run.mockResolvedValueOnce({
                records: [{ get: () => ({}) }],
            });
            const citation = await citationManager.createCitation('entity-1', 'document-1', 'This is the cited content', 0, 25, 0.9, { source: 'test' });
            (0, globals_1.expect)(citation.id).toBeDefined();
            (0, globals_1.expect)(citation.documentId).toBe('document-1');
            (0, globals_1.expect)(citation.content).toBe('This is the cited content');
            (0, globals_1.expect)(citation.confidence).toBe(0.9);
            (0, globals_1.expect)(citation.sourceType).toBe('document');
        });
    });
    (0, globals_1.describe)('getCitationsForEntity', () => {
        (0, globals_1.it)('should retrieve all citations for an entity', async () => {
            mockSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'c') {
                                return {
                                    properties: {
                                        id: 'citation-1',
                                        spanStart: 0,
                                        spanEnd: 100,
                                        content: 'Test content',
                                        confidence: 0.85,
                                        metadata: '{}',
                                    },
                                };
                            }
                            if (key === 'documentId')
                                return 'doc-1';
                            if (key === 'documentTitle')
                                return 'Test Document';
                            return null;
                        },
                    },
                ],
            });
            const citations = await citationManager.getCitationsForEntity('entity-1');
            (0, globals_1.expect)(citations).toHaveLength(1);
            (0, globals_1.expect)(citations[0].documentId).toBe('doc-1');
            (0, globals_1.expect)(citations[0].confidence).toBe(0.85);
        });
        (0, globals_1.it)('should return empty array when no citations found', async () => {
            mockSession.run.mockResolvedValueOnce({ records: [] });
            const citations = await citationManager.getCitationsForEntity('entity-none');
            (0, globals_1.expect)(citations).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('validateCitation', () => {
        (0, globals_1.it)('should validate a valid citation', async () => {
            mockSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'c') {
                                return {
                                    properties: {
                                        spanStart: 0,
                                        spanEnd: 25,
                                        content: 'This is the cited content',
                                        confidence: 0.9,
                                    },
                                };
                            }
                            if (key === 'documentContent') {
                                return 'This is the cited content in a longer document';
                            }
                            return null;
                        },
                    },
                ],
            });
            const validation = await citationManager.validateCitation('citation-1');
            (0, globals_1.expect)(validation.isValid).toBe(true);
            (0, globals_1.expect)(validation.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect invalid span bounds', async () => {
            mockSession.run.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'c') {
                                return {
                                    properties: {
                                        spanStart: -1,
                                        spanEnd: 25,
                                        content: 'Content',
                                        confidence: 0.9,
                                    },
                                };
                            }
                            if (key === 'documentContent')
                                return 'Document content';
                            return null;
                        },
                    },
                ],
            });
            const validation = await citationManager.validateCitation('citation-1');
            (0, globals_1.expect)(validation.isValid).toBe(false);
            (0, globals_1.expect)(validation.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should return invalid for non-existent citation', async () => {
            mockSession.run.mockResolvedValueOnce({ records: [] });
            const validation = await citationManager.validateCitation('citation-none');
            (0, globals_1.expect)(validation.isValid).toBe(false);
            (0, globals_1.expect)(validation.errors).toContain('Citation not found');
        });
    });
    (0, globals_1.describe)('formatCitationsForAnswer', () => {
        (0, globals_1.it)('should format citations for display', () => {
            const citations = [
                {
                    id: 'c1',
                    documentId: 'doc-1',
                    documentTitle: 'Research Paper',
                    spanStart: 0,
                    spanEnd: 100,
                    content: 'Content',
                    confidence: 0.9,
                    sourceType: 'document',
                },
                {
                    id: 'c2',
                    documentId: 'doc-2',
                    documentTitle: 'News Article',
                    spanStart: 0,
                    spanEnd: 50,
                    content: 'Content',
                    confidence: 0.75,
                    sourceType: 'document',
                },
            ];
            const formatted = citationManager.formatCitationsForAnswer(citations);
            (0, globals_1.expect)(formatted).toContain('[1] Research Paper');
            (0, globals_1.expect)(formatted).toContain('[2] News Article');
            (0, globals_1.expect)(formatted).toContain('90%');
            (0, globals_1.expect)(formatted).toContain('75%');
        });
        (0, globals_1.it)('should return empty string for no citations', () => {
            const formatted = citationManager.formatCitationsForAnswer([]);
            (0, globals_1.expect)(formatted).toBe('');
        });
    });
    (0, globals_1.describe)('extractCitationMarkers', () => {
        (0, globals_1.it)('should extract citation markers from text', () => {
            const text = 'This is a fact [1] and another fact [2]. See also [1] again.';
            const markers = citationManager.extractCitationMarkers(text);
            (0, globals_1.expect)(markers).toHaveLength(3);
            (0, globals_1.expect)(markers[0].index).toBe(1);
            (0, globals_1.expect)(markers[1].index).toBe(2);
            (0, globals_1.expect)(markers[2].index).toBe(1);
        });
        (0, globals_1.it)('should return empty array for text without markers', () => {
            const text = 'This is a plain text without any citation markers.';
            const markers = citationManager.extractCitationMarkers(text);
            (0, globals_1.expect)(markers).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('getCitationStats', () => {
        (0, globals_1.it)('should compute citation statistics', async () => {
            const evidenceChunks = [
                {
                    id: 'chunk-1',
                    content: 'Content 1',
                    citations: [
                        {
                            id: 'c1',
                            documentId: 'doc-1',
                            spanStart: 0,
                            spanEnd: 10,
                            content: 'Content',
                            confidence: 0.9,
                            sourceType: 'document',
                        },
                    ],
                    graphPaths: [],
                    relevanceScore: 0.9,
                    tenantId: 'tenant-1',
                },
                {
                    id: 'chunk-2',
                    content: 'Content 2',
                    citations: [
                        {
                            id: 'c2',
                            documentId: 'doc-2',
                            spanStart: 0,
                            spanEnd: 10,
                            content: 'Content',
                            confidence: 0.8,
                            sourceType: 'graph',
                        },
                    ],
                    graphPaths: [],
                    relevanceScore: 0.8,
                    tenantId: 'tenant-1',
                },
            ];
            const stats = await citationManager.getCitationStats(evidenceChunks);
            (0, globals_1.expect)(stats.totalCitations).toBe(2);
            (0, globals_1.expect)(stats.bySourceType.document).toBe(1);
            (0, globals_1.expect)(stats.bySourceType.graph).toBe(1);
            (0, globals_1.expect)(stats.averageConfidence).toBe(0.85);
            (0, globals_1.expect)(stats.uniqueDocuments).toBe(2);
        });
    });
});
