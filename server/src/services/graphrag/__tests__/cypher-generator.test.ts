
import { describe, expect, it, beforeEach } from '@jest/globals';
import { CypherGenerator, CypherLlmInterface } from '../cypher-generator.js';

// Mock LLM Adapter
class MockCypherLlm implements CypherLlmInterface {
  private mockResponse: { cypher: string; explanation: string } = {
    cypher: 'MATCH (c:Case {id: $caseId}) MATCH (c)--(n) RETURN n',
    explanation: 'Default mock',
  };

  setResponse(response: { cypher: string; explanation: string }) {
    this.mockResponse = response;
  }

  async generateCypher(prompt: string) {
    return this.mockResponse;
  }
}

describe('CypherGenerator', () => {
  let generator: CypherGenerator;
  let mockLlm: MockCypherLlm;
  const mockSchema = {
    nodeTypes: ['Person', 'Case'],
    edgeTypes: ['KNOWS'],
    schemaSummary: 'Test Schema',
  };

  beforeEach(() => {
    mockLlm = new MockCypherLlm();
    generator = new CypherGenerator(mockLlm);
  });

  describe('Template Matching', () => {
    it('should match "between X and Y" template with params', async () => {
      const question = 'Find connection between "Alice" and "Bob"';
      const result = await generator.generate(question, mockSchema);

      expect(result).toBeDefined();
      expect(result?.mode).toBe('template');
      expect(result?.templateId).toBe('shortest_path');
      expect(result?.cypher).toContain('MATCH (c:Case {id: $caseId})');
      expect(result?.params).toEqual({ source: 'alice', target: 'bob' });
    });

    it('should match "timeline of X" template with params', async () => {
      const question = 'What is the timeline of "Project Alpha"';
      const result = await generator.generate(question, mockSchema);

      expect(result).toBeDefined();
      expect(result?.mode).toBe('template');
      expect(result?.templateId).toBe('entity_timeline');
      expect(result?.cypher).toContain('ORDER BY r.date DESC');
      expect(result?.params).toEqual({ entity: 'project alpha' });
    });
  });

  describe('LLM Fallback', () => {
    it('should fall back to LLM and validate scope', async () => {
      mockLlm.setResponse({
        cypher: 'MATCH (c:Case {id: $caseId}) MATCH (c)--(p:Person {name: "Charlie"}) RETURN p',
        explanation: 'Finding Charlie connected to case',
      });

      const question = 'Who is Charlie?';
      const result = await generator.generate(question, mockSchema);

      expect(result).toBeDefined();
      expect(result?.mode).toBe('llm');
      expect(result?.cypher).toContain('$caseId');
    });

    it('should reject unsafe Cypher from LLM', async () => {
      mockLlm.setResponse({
        cypher: 'MATCH (n) DELETE n',
        explanation: 'Malicious delete',
      });

      const question = 'Delete everything';
      const result = await generator.generate(question, mockSchema);

      expect(result).toBeNull();
    });

    it('should reject unscoped Cypher from LLM', async () => {
        mockLlm.setResponse({
          cypher: 'MATCH (n) RETURN n',
          explanation: 'Unscoped dump',
        });

        const question = 'Get all';
        const result = await generator.generate(question, mockSchema);

        expect(result).toBeNull(); // Missing $caseId
      });
  });
});
