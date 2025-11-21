/**
 * Incident Investigation Example
 *
 * Demonstrates using the Agentic Mesh to investigate an incident through
 * a multi-agent workflow: Planner -> Research -> Analysis -> Report
 */

import {
  PlannerAgent,
  ResearchAgent,
  RedTeamAgent,
  JudgeAgent,
  AgentFactory,
  createDefaultToolRegistry,
  type AgentServices,
  type TaskInput,
} from '@intelgraph/mesh-sdk';
import { createLogger, createMeshMetrics } from '@intelgraph/mesh-observability';

// Register agents
AgentFactory.register('planner', PlannerAgent);
AgentFactory.register('researcher', ResearchAgent);
AgentFactory.register('red_teamer', RedTeamAgent);
AgentFactory.register('judge', JudgeAgent);

// Initialize
const logger = createLogger('incident-investigation-demo');
const metrics = createMeshMetrics('demo');
const toolRegistry = createDefaultToolRegistry();

/**
 * Mock services for demonstration
 */
function createDemoServices(): AgentServices {
  return {
    provenance: {
      record: async (event) => {
        logger.info('Provenance recorded', { type: event.type });
        return crypto.randomUUID();
      },
      query: async () => [],
    },
    tools: {
      invoke: async (name, input) => {
        logger.info('Tool invoked', { tool: name });
        // Simulate search results for investigation
        if (name === 'internal_search' || name === 'search') {
          return [
            {
              title: 'API Gateway logs showing 503 errors',
              snippet: 'Multiple 503 errors at 14:00 UTC from service-payment',
              source: 'logs/api-gateway',
              score: 0.95,
            },
            {
              title: 'Database connection pool exhaustion',
              snippet: 'Connection pool reached max limit (100) at 13:58 UTC',
              source: 'logs/postgres',
              score: 0.88,
            },
          ];
        }
        return { success: true };
      },
      list: async () => toolRegistry.list(),
      get: async (name) => toolRegistry.get(name) ?? null,
    },
    model: {
      complete: async (prompt, options) => {
        logger.info('Model called for analysis');
        return {
          content: `## Incident Analysis

### Root Cause
The API latency spike was caused by database connection pool exhaustion, triggered by a memory leak in the payment service.

### Timeline
- 13:55 UTC: Memory usage in payment-service started climbing
- 13:58 UTC: Database connection pool reached max capacity
- 14:00 UTC: API gateway started returning 503 errors
- 14:15 UTC: Auto-scaling kicked in, new instances started
- 14:20 UTC: Service recovered

### Impact
- ~500 failed transactions
- 15 minute degraded service
- Estimated revenue impact: $2,500

### Recommendations
1. Increase connection pool monitoring alerts
2. Implement circuit breaker pattern
3. Review payment-service memory management
4. Add connection pool metrics to dashboard`,
          tokensIn: 800,
          tokensOut: 400,
          latencyMs: 2000,
          model: 'claude-sonnet-4-5-20250929',
          provider: 'anthropic',
        };
      },
      chat: async () => ({
        content: '',
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: 0,
        model: '',
        provider: '',
      }),
    },
    mesh: {
      spawnSubtask: async (type, input) => {
        logger.info('Subtask spawned', { type });
        return crypto.randomUUID();
      },
      awaitSubtask: async () => ({
        taskId: '',
        status: 'completed' as const,
        result: {},
        metadata: {
          tokensUsed: 0,
          costUsd: 0,
          latencyMs: 0,
          modelCallCount: 0,
          toolCallCount: 0,
          provenanceRecordIds: [],
        },
      }),
      requestAgent: async () => null,
    },
    metrics: {
      increment: (name, tags) => metrics.tasksTotal.inc(tags ?? {}),
      gauge: () => {},
      histogram: () => {},
      timing: () => {},
    },
    logger,
  };
}

/**
 * Run the incident investigation workflow
 */
async function runIncidentInvestigation() {
  console.log('\n=== Incident Investigation Workflow Demo ===\n');

  const services = createDemoServices();

  // Step 1: Research phase - gather evidence
  console.log('Phase 1: Evidence Gathering');
  const researcher = AgentFactory.create('researcher') as ResearchAgent;

  const researchInput: TaskInput<{
    query: string;
    sources: ('internal' | 'code')[];
    depth: 'deep';
  }> = {
    task: {
      id: crypto.randomUUID(),
      type: 'incident_research',
      input: {},
      priority: 2,
      metadata: {
        incidentId: 'INC-2024-001',
        severity: 'high',
      },
      createdAt: new Date().toISOString(),
    },
    context: {
      routingDecision: {
        selectedAgent: researcher.getId(),
        selectedModel: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
        strategy: 'max_quality',
        confidence: 0.95,
        alternatives: [],
        decidedAt: new Date().toISOString(),
      },
      availableTools: toolRegistry.list(),
      budgetRemaining: { maxTokens: 20000, maxCostUsd: 2.0 },
      deadline: new Date(Date.now() + 600000).toISOString(),
    },
    payload: {
      query: 'API latency spike at 14:00 UTC - find related logs and metrics',
      sources: ['internal', 'code'],
      depth: 'deep',
    },
  };

  console.log('  Searching logs and metrics...');
  const researchResult = await researcher.onTaskReceived(researchInput, services);
  console.log('  Findings:', researchResult.result?.findings?.length ?? 0, 'pieces of evidence');

  // Step 2: Security analysis - check for attack vectors
  console.log('\nPhase 2: Security Analysis');
  const redTeam = AgentFactory.create('red_teamer') as RedTeamAgent;

  const securityInput: TaskInput<{
    content: string;
    contentType: 'text';
    focusAreas: ('security' | 'data_leakage')[];
  }> = {
    task: {
      id: crypto.randomUUID(),
      type: 'security_analysis',
      input: {},
      priority: 2,
      metadata: {},
      createdAt: new Date().toISOString(),
    },
    context: researchInput.context,
    payload: {
      content: researchResult.result?.synthesis ?? 'Incident summary',
      contentType: 'text',
      focusAreas: ['security', 'data_leakage'],
    },
  };

  console.log('  Checking for security implications...');
  const securityResult = await redTeam.onTaskReceived(securityInput, services);
  console.log('  Risk level:', securityResult.result?.overallRisk ?? 'unknown');

  // Step 3: Generate final report
  console.log('\nPhase 3: Report Generation');
  console.log('  Synthesizing findings...');

  // Simulated final report
  console.log('\n--- INCIDENT REPORT ---');
  console.log('Incident ID: INC-2024-001');
  console.log('Status: Resolved');
  console.log('Root Cause: Database connection pool exhaustion');
  console.log('Impact: ~500 failed transactions, $2,500 revenue impact');
  console.log('Duration: 15 minutes');
  console.log('Security Risk: Low (no data breach detected)');
  console.log('\nRecommendations:');
  console.log('  1. Increase connection pool monitoring');
  console.log('  2. Implement circuit breaker pattern');
  console.log('  3. Review payment-service memory management');

  console.log('\n=== Investigation Complete ===\n');
}

// Run if executed directly
runIncidentInvestigation().catch(console.error);
