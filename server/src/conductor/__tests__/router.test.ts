// Tests for MoE Router
// Comprehensive test suite for routing decisions and feature extraction

import { MoERouter } from '../router';
import { ConductInput } from '../types';

describe('MoERouter', () => {
  let router: MoERouter;

  beforeEach(() => {
    router = new MoERouter();
  });

  describe('route', () => {
    test('routes graph tasks to GRAPH_TOOL', () => {
      const input: ConductInput = {
        task: 'Run Cypher: MATCH (n)-[r]->(m) RETURN count(*)',
        sensitivity: 'low',
        maxLatencyMs: 4000,
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('GRAPH_TOOL');
      expect(decision.reason).toContain('graph-related keywords');
      expect(decision.confidence).toBeGreaterThan(0.5);
    });

    test('routes file operations to FILES_TOOL', () => {
      const input: ConductInput = {
        task: "Search for files containing 'classified' in /documents",
        sensitivity: 'low',
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('FILES_TOOL');
      expect(decision.reason).toContain('file operations required');
    });

    test('routes OSINT tasks to OSINT_TOOL', () => {
      const input: ConductInput = {
        task: 'Search web for threat intelligence on domain example.com',
        sensitivity: 'low',
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('OSINT_TOOL');
      expect(decision.reason).toContain('OSINT/web research');
    });

    test('routes export requests to EXPORT_TOOL', () => {
      const input: ConductInput = {
        task: 'Generate PDF report for investigation case-123',
        sensitivity: 'low',
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('EXPORT_TOOL');
      expect(decision.reason).toContain('export/report generation');
    });

    test('routes simple queries to LLM_LIGHT for speed', () => {
      const input: ConductInput = {
        task: 'What is the capital of France?',
        sensitivity: 'low',
        maxLatencyMs: 1000,
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('LLM_LIGHT');
      expect(decision.reason).toContain('tight latency');
    });

    test('routes complex queries to LLM_HEAVY', () => {
      const input: ConductInput = {
        task: 'Analyze the legal implications of cross-border data sharing in intelligence operations, considering GDPR compliance, national security exemptions, and bilateral intelligence agreements. Provide a comprehensive framework for risk assessment and mitigation strategies for a multi-jurisdictional investigation involving sensitive personal data.',
        sensitivity: 'low',
        maxLatencyMs: 10000,
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('LLM_HEAVY');
      expect(decision.reason).toContain('complex');
    });

    test('routes investigation context queries to RAG_TOOL', () => {
      const input: ConductInput = {
        task: 'What connections exist between entity A and entity B?',
        sensitivity: 'low',
        investigationId: 'inv-123',
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('RAG_TOOL');
      expect(decision.reason).toContain('investigation context');
    });

    test('falls back to LLM_LIGHT when no specific tool matches', () => {
      const input: ConductInput = {
        task: 'Random question without specific keywords',
        sensitivity: 'low',
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('LLM_LIGHT');
      expect(decision.reason).toContain('Fallback');
    });
  });

  describe('feature extraction', () => {
    test('detects graph keywords correctly', () => {
      const inputs = [
        'Execute cypher query',
        'Find pagerank scores',
        'Calculate betweenness centrality',
        'Show shortest path between nodes',
        'Return all relationships',
      ];

      inputs.forEach((task) => {
        const decision = router.route({ task, sensitivity: 'low' });
        expect(decision.features.hasGraphKeywords).toBe(true);
      });
    });

    test('detects file keywords correctly', () => {
      const inputs = [
        'Read document file',
        'Upload PDF attachment',
        'Search files for keyword',
        'Download CSV data',
      ];

      inputs.forEach((task) => {
        const decision = router.route({ task, sensitivity: 'low' });
        expect(decision.features.hasFileKeywords).toBe(true);
      });
    });

    test('detects OSINT keywords correctly', () => {
      const inputs = [
        'Search web for information',
        'Fetch URL content',
        'Scrape social media',
        'Check domain whois',
      ];

      inputs.forEach((task) => {
        const decision = router.route({ task, sensitivity: 'low' });
        expect(decision.features.hasOSINTKeywords).toBe(true);
      });
    });

    test('calculates complexity score correctly', () => {
      const simpleTask = 'Hello';
      const complexTask =
        'Analyze comprehensive forensic investigation legal policy regulatory framework advanced multi-step detailed complex deep';

      const simpleDecision = router.route({
        task: simpleTask,
        sensitivity: 'low',
      });
      const complexDecision = router.route({
        task: complexTask,
        sensitivity: 'low',
      });

      expect(simpleDecision.features.complexityScore).toBeLessThan(
        complexDecision.features.complexityScore,
      );
      expect(complexDecision.features.complexityScore).toBeGreaterThan(5);
    });
  });

  describe('security constraints', () => {
    test('respects sensitivity levels in routing', () => {
      const secretInput: ConductInput = {
        task: 'Process classified intelligence data',
        sensitivity: 'secret',
      };

      const decision = router.route(secretInput);
      expect(decision.features.sensitivityLevel).toBe('secret');
    });

    test('considers user context in routing', () => {
      const input: ConductInput = {
        task: 'Administrative query',
        sensitivity: 'low',
        userContext: {
          role: 'admin',
          scopes: ['graph:read', 'files:read'],
        },
      };

      const decision = router.route(input);
      expect(decision.features.userRole).toBe('admin');
    });
  });

  describe('routing statistics', () => {
    test('tracks routing decisions', () => {
      const inputs = [
        { task: 'MATCH (n) RETURN n', sensitivity: 'low' as const },
        { task: 'Search files', sensitivity: 'low' as const },
        { task: 'Simple question', sensitivity: 'low' as const },
      ];

      inputs.forEach((input) => router.route(input));

      const stats = router.getRoutingStats();
      expect(stats.totalDecisions).toBe(3);
      expect(Object.keys(stats.expertDistribution)).toContain('GRAPH_TOOL');
      expect(Object.keys(stats.expertDistribution)).toContain('FILES_TOOL');
    });

    test('calculates average confidence correctly', () => {
      const input: ConductInput = {
        task: 'MATCH (n) RETURN count(n)',
        sensitivity: 'low',
      };

      router.route(input);
      router.route(input);

      const stats = router.getRoutingStats();
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    test('handles empty task', () => {
      const input: ConductInput = {
        task: '',
        sensitivity: 'low',
      };

      const decision = router.route(input);
      expect(decision.expert).toBeDefined();
      expect(decision.reason).toBeDefined();
    });

    test('handles very long tasks', () => {
      const longTask = 'A'.repeat(10000);
      const input: ConductInput = {
        task: longTask,
        sensitivity: 'low',
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('LLM_HEAVY'); // Should route to heavy model
      expect(decision.features.taskLength).toBe(10000);
    });

    test('handles tight latency constraints', () => {
      const input: ConductInput = {
        task: 'Complex analysis that would normally go to heavy model',
        sensitivity: 'low',
        maxLatencyMs: 500,
      };

      const decision = router.route(input);
      expect(decision.expert).toBe('LLM_LIGHT'); // Should prefer speed
    });

    test('handles multiple keyword matches', () => {
      const input: ConductInput = {
        task: 'Search files for cypher queries and export results to PDF',
        sensitivity: 'low',
      };

      const decision = router.route(input);
      // Should pick the first matching expert (in priority order)
      expect(['GRAPH_TOOL', 'FILES_TOOL', 'EXPORT_TOOL']).toContain(
        decision.expert,
      );
      expect(decision.alternatives.length).toBeGreaterThan(0);
    });
  });
});
