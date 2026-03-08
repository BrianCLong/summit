"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const cypher_generator_js_1 = require("../cypher-generator.js");
// Mock LLM Adapter
class MockCypherLlm {
    mockResponse = {
        cypher: 'MATCH (c:Case {id: $caseId}) MATCH (c)--(n) RETURN n',
        explanation: 'Default mock',
    };
    setResponse(response) {
        this.mockResponse = response;
    }
    async generateCypher(prompt) {
        return this.mockResponse;
    }
}
(0, globals_1.describe)('CypherGenerator', () => {
    let generator;
    let mockLlm;
    const mockSchema = {
        nodeTypes: ['Person', 'Case'],
        edgeTypes: ['KNOWS'],
        schemaSummary: 'Test Schema',
    };
    (0, globals_1.beforeEach)(() => {
        mockLlm = new MockCypherLlm();
        generator = new cypher_generator_js_1.CypherGenerator(mockLlm);
    });
    (0, globals_1.describe)('Template Matching', () => {
        (0, globals_1.it)('should match "between X and Y" template with params', async () => {
            const question = 'Find connection between "Alice" and "Bob"';
            const result = await generator.generate(question, mockSchema);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.mode).toBe('template');
            (0, globals_1.expect)(result?.templateId).toBe('shortest_path');
            (0, globals_1.expect)(result?.cypher).toContain('MATCH (c:Case {id: $caseId})');
            (0, globals_1.expect)(result?.params).toEqual({ source: 'alice', target: 'bob' });
        });
        (0, globals_1.it)('should match "timeline of X" template with params', async () => {
            const question = 'What is the timeline of "Project Alpha"';
            const result = await generator.generate(question, mockSchema);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.mode).toBe('template');
            (0, globals_1.expect)(result?.templateId).toBe('entity_timeline');
            (0, globals_1.expect)(result?.cypher).toContain('ORDER BY r.date DESC');
            (0, globals_1.expect)(result?.params).toEqual({ entity: 'project alpha' });
        });
    });
    (0, globals_1.describe)('LLM Fallback', () => {
        (0, globals_1.it)('should fall back to LLM and validate scope', async () => {
            mockLlm.setResponse({
                cypher: 'MATCH (c:Case {id: $caseId}) MATCH (c)--(p:Person {name: "Charlie"}) RETURN p',
                explanation: 'Finding Charlie connected to case',
            });
            const question = 'Who is Charlie?';
            const result = await generator.generate(question, mockSchema);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.mode).toBe('llm');
            (0, globals_1.expect)(result?.cypher).toContain('$caseId');
        });
        (0, globals_1.it)('should reject unsafe Cypher from LLM', async () => {
            mockLlm.setResponse({
                cypher: 'MATCH (n) DELETE n',
                explanation: 'Malicious delete',
            });
            const question = 'Delete everything';
            const result = await generator.generate(question, mockSchema);
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should reject unscoped Cypher from LLM', async () => {
            mockLlm.setResponse({
                cypher: 'MATCH (n) RETURN n',
                explanation: 'Unscoped dump',
            });
            const question = 'Get all';
            const result = await generator.generate(question, mockSchema);
            (0, globals_1.expect)(result).toBeNull(); // Missing $caseId
        });
    });
});
