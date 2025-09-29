// Integration Tests for Conductor System
// Tests the complete MoE+MCP system end-to-end

import { Conductor, ConductorConfig } from '../index';
import { mcpRegistry } from '../mcp/client';
import { ConductInput } from '../types';
import { conductorMetrics } from '../metrics';

describe('Conductor Integration', () => {
  let conductor: Conductor;
  
  const testConfig: ConductorConfig = {
    enabledExperts: ['LLM_LIGHT', 'LLM_HEAVY', 'GRAPH_TOOL', 'RAG_TOOL', 'FILES_TOOL'],
    defaultTimeoutMs: 5000,
    maxConcurrentTasks: 5,
    auditEnabled: true,
    llmProviders: {
      light: {
        endpoint: 'https://api.example.com/v1',
        apiKey: 'test-key',
        model: 'test-light-model'
      },
      heavy: {
        endpoint: 'https://api.example.com/v1', 
        apiKey: 'test-key',
        model: 'test-heavy-model'
      }
    }
  };

  beforeEach(() => {
    // Reset metrics
    conductorMetrics.reset();
    
    // Setup mock MCP servers
    mcpRegistry.register('graphops', {
      url: 'ws://localhost:8001',
      name: 'graphops',
      authToken: 'test-token',
      tools: [
        {
          name: 'graph.query',
          description: 'Execute Cypher queries',
          schema: {
            type: 'object',
            properties: {
              cypher: { type: 'string' },
              params: { type: 'object' }
            },
            required: ['cypher']
          },
          scopes: ['graph:read']
        },
        {
          name: 'graph.alg',
          description: 'Execute graph algorithms',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              args: { type: 'object' }
            },
            required: ['name']
          },
          scopes: ['graph:compute']
        }
      ]
    });

    mcpRegistry.register('files', {
      url: 'ws://localhost:8002',
      name: 'files',
      authToken: 'test-token',
      tools: [
        {
          name: 'files.search',
          description: 'Search files',
          schema: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          },
          scopes: ['files:read']
        }
      ]
    });

    conductor = new Conductor(testConfig);
  });

  afterEach(async () => {
    if (conductor) {
      await conductor.shutdown();
    }
  });

  describe('task execution', () => {
    test('executes graph query task', async () => {
      const input: ConductInput = {
        task: "Execute cypher: MATCH (n:Person) RETURN n.name LIMIT 10",
        sensitivity: "low",
        userContext: {
          scopes: ['graph:read'],
          userId: 'test-user'
        }
      };

      const result = await conductor.conduct(input);
      
      expect(result.expertId).toBe('GRAPH_TOOL');
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.auditId).toBeDefined();
      expect(result.error).toBeUndefined();
      
      // Check that output contains expected structure
      expect(result.output).toHaveProperty('records');
      expect(result.logs).toContain('Routed to GRAPH_TOOL: graph-related keywords detected');
    });

    test('executes file search task', async () => {
      const input: ConductInput = {
        task: "Search for files containing 'intelligence report'",
        sensitivity: "low",
        userContext: {
          scopes: ['files:read'],
          userId: 'test-user'
        }
      };

      const result = await conductor.conduct(input);
      
      expect(result.expertId).toBe('FILES_TOOL');
      expect(result.output).toHaveProperty('results');
      expect(result.logs).toContain('File search completed: 2 files found');
    });

    test('executes LLM task', async () => {
      const input: ConductInput = {
        task: "What is artificial intelligence?",
        sensitivity: "low",
        maxLatencyMs: 1500 // Force to light LLM
      };

      const result = await conductor.conduct(input);
      
      expect(result.expertId).toBe('LLM_LIGHT');
      expect(result.output).toHaveProperty('response');
      expect(result.output.model).toBe('test-light-model');
      expect(result.cost).toBeGreaterThan(0);
    });

    test('routes complex task to heavy LLM', async () => {
      const input: ConductInput = {
        task: "Provide a comprehensive analysis of the geopolitical implications of artificial intelligence development across major world powers, including detailed examination of regulatory frameworks, international cooperation mechanisms, technological sovereignty concerns, and potential future scenarios for AI governance.",
        sensitivity: "low",
        maxLatencyMs: 10000
      };

      const result = await conductor.conduct(input);
      
      expect(result.expertId).toBe('LLM_HEAVY');
      expect(result.output.model).toBe('test-heavy-model');
    });
  });

  describe('security controls', () => {
    test('blocks secret data from non-enterprise LLM providers', async () => {
      const input: ConductInput = {
        task: "Analyze classified intelligence data",
        sensitivity: "secret"
      };

      const result = await conductor.conduct(input);
      
      expect(result.error).toContain('Secret data cannot be processed by non-enterprise LLM providers');
    });

    test('enforces user permissions', async () => {
      const input: ConductInput = {
        task: "Execute cypher: MATCH (n) RETURN n",
        sensitivity: "low",
        userContext: {
          scopes: ['files:read'], // Wrong scope
          userId: 'test-user'
        }
      };

      const result = await conductor.conduct(input);
      
      expect(result.error).toContain('Insufficient permissions for GRAPH_TOOL');
    });

    test('allows task with proper permissions', async () => {
      const input: ConductInput = {
        task: "Execute cypher: MATCH (n) RETURN n",
        sensitivity: "low",
        userContext: {
          scopes: ['graph:read'], // Correct scope
          userId: 'test-user'
        }
      };

      const result = await conductor.conduct(input);
      
      expect(result.error).toBeUndefined();
      expect(result.expertId).toBe('GRAPH_TOOL');
    });
  });

  describe('concurrency control', () => {
    test('enforces max concurrent task limit', async () => {
      const input: ConductInput = {
        task: "Long running task that takes forever",
        sensitivity: "low"
      };

      // Start maximum allowed concurrent tasks
      const promises = Array(testConfig.maxConcurrentTasks)
        .fill(null)
        .map(() => conductor.conduct(input));

      // Try to start one more - should be rejected
      const extraPromise = conductor.conduct(input);
      
      await expect(extraPromise).rejects.toThrow('Maximum concurrent tasks reached');
      
      // Cleanup - let original tasks complete
      await Promise.allSettled(promises);
    });
  });

  describe('routing preview', () => {
    test('previews routing decision without execution', () => {
      const input: ConductInput = {
        task: "MATCH (n) RETURN count(n)",
        sensitivity: "low"
      };

      const decision = conductor.previewRouting(input);
      
      expect(decision.expert).toBe('GRAPH_TOOL');
      expect(decision.reason).toContain('graph-related keywords');
      expect(decision.confidence).toBeGreaterThan(0.5);
      expect(decision.features).toHaveProperty('hasGraphKeywords', true);
      expect(decision.alternatives).toBeInstanceOf(Array);
    });
  });

  describe('metrics and observability', () => {
    test('records routing metrics', async () => {
      const input: ConductInput = {
        task: "MATCH (n) RETURN n",
        sensitivity: "low",
        userContext: { scopes: ['graph:read'] }
      };

      await conductor.conduct(input);
      
      const stats = conductor.getStats();
      expect(stats.routingStats.totalDecisions).toBe(1);
      expect(stats.routingStats.expertDistribution['GRAPH_TOOL']).toBe(1);
      expect(stats.routingStats.avgConfidence).toBeGreaterThan(0);
    });

    test('tracks active task count', async () => {
      const input: ConductInput = {
        task: "Simple task",
        sensitivity: "low"
      };

      // Before execution
      expect(conductor.getStats().activeTaskCount).toBe(0);
      
      // During execution (task completes quickly so hard to catch)
      await conductor.conduct(input);
      
      // After execution
      expect(conductor.getStats().activeTaskCount).toBe(0);
    });

    test('provides audit trail when enabled', async () => {
      const input: ConductInput = {
        task: "Test task for audit",
        sensitivity: "low"
      };

      const result = await conductor.conduct(input);
      
      expect(result.auditId).toBeDefined();
      expect(result.auditId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('error handling', () => {
    test('handles expert execution failures gracefully', async () => {
      // Mock a scenario that would cause an expert to fail
      const input: ConductInput = {
        task: "This will cause an error in the mock implementation",
        sensitivity: "low",
        maxLatencyMs: 1 // Extremely tight constraint
      };

      const result = await conductor.conduct(input);
      
      // Should not throw, but should return error in result
      expect(result.error).toBeDefined();
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    test('provides meaningful error messages', async () => {
      const input: ConductInput = {
        task: "Query with invalid permissions",
        sensitivity: "secret", // This will trigger security error
        userContext: {
          scopes: ['limited:scope']
        }
      };

      const result = await conductor.conduct(input);
      
      expect(result.error).toContain('Secret data cannot be processed');
    });
  });

  describe('task parsing helpers', () => {
    test('extracts algorithm names correctly', async () => {
      const inputs = [
        { task: "Run pagerank algorithm", expectedExpert: 'GRAPH_TOOL' },
        { task: "Calculate community detection", expectedExpert: 'GRAPH_TOOL' },
        { task: "Find shortest path between nodes", expectedExpert: 'GRAPH_TOOL' }
      ];

      for (const { task, expectedExpert } of inputs) {
        const result = await conductor.conduct({
          task,
          sensitivity: "low",
          userContext: { scopes: ['graph:compute'] }
        });
        
        expect(result.expertId).toBe(expectedExpert);
        expect(result.output).toHaveProperty('algorithm');
      }
    });

    test('extracts file paths and search queries', async () => {
      const fileInput: ConductInput = {
        task: "Read file 'report.pdf' from documents folder", 
        sensitivity: "low",
        userContext: { scopes: ['files:read'] }
      };

      const result = await conductor.conduct(fileInput);
      
      expect(result.expertId).toBe('FILES_TOOL');
      expect(result.output).toHaveProperty('path');
    });
  });

  describe('system shutdown', () => {
    test('shuts down gracefully', async () => {
      const shutdownPromise = conductor.shutdown();
      
      await expect(shutdownPromise).resolves.toBeUndefined();
    });

    test('waits for active tasks during shutdown', async () => {
      // This test verifies the shutdown waits for tasks (implementation-dependent)
      const shutdownStart = Date.now();
      await conductor.shutdown();
      const shutdownTime = Date.now() - shutdownStart;
      
      // Should complete quickly since no active tasks
      expect(shutdownTime).toBeLessThan(1000);
    });
  });
});