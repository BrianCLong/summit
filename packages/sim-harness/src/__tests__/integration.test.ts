/**
 * Integration tests - requires running IntelGraph stack
 * Run with: pnpm test:integration
 */

import { ScenarioGenerator } from '../generator/ScenarioGenerator';
import { GhostAnalyst } from '../analyst/GhostAnalyst';
import { MetricsCollector } from '../metrics/MetricsCollector';
import type { WorkflowScript } from '../types/index';

const API_URL = process.env.API_URL || 'http://localhost:4000/graphql';
const TENANT_ID = process.env.TENANT_ID || 'test-sim-harness';

// Skip if API not available
const describeIntegration = process.env.SKIP_INTEGRATION ? describe.skip : describe;

describeIntegration('Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against:', API_URL);
  });

  it('should generate scenario and run basic workflow', async () => {
    // Generate scenario
    const generator = new ScenarioGenerator({
      template: 'fraud-ring',
      params: { seed: 42, nodeCount: 10 },
    });

    const scenario = await generator.generate();
    expect(scenario.entities.length).toBeGreaterThan(0);

    // Define minimal workflow
    const workflow: WorkflowScript = {
      name: 'integration-test-workflow',
      steps: [
        {
          name: 'health-check',
          action: 'graphql-query',
          query: 'query { __typename }',
        },
      ],
    };

    // Run ghost analyst
    const analyst = new GhostAnalyst({
      apiUrl: API_URL,
      tenantId: TENANT_ID,
      script: workflow,
      verbose: true,
    });

    const session = await analyst.run({
      scenarioId: scenario.id,
      scenario,
    });

    expect(session.status).toBe('completed');
    expect(session.steps.length).toBe(1);
    expect(session.steps[0].status).toBe('success');
  }, 30000); // 30 second timeout

  it('should collect metrics from multiple sessions', async () => {
    const generator = new ScenarioGenerator({
      template: 'fraud-ring',
      params: { seed: 123, nodeCount: 5 },
    });

    const scenario = await generator.generate();

    const workflow: WorkflowScript = {
      name: 'multi-session-test',
      steps: [
        {
          name: 'health-check',
          action: 'graphql-query',
          query: 'query { __typename }',
        },
      ],
    };

    const collector = new MetricsCollector();
    collector.setScenario(scenario);

    // Run 3 sessions
    for (let i = 0; i < 3; i++) {
      const analyst = new GhostAnalyst({
        apiUrl: API_URL,
        tenantId: TENANT_ID,
        script: workflow,
      });

      const session = await analyst.run({
        scenarioId: scenario.id,
        scenario,
      });

      collector.addSession(session);
    }

    const report = await collector.generateReport();

    expect(report.sessions.length).toBe(3);
    expect(report.aggregateMetrics.reliability.successRate).toBeGreaterThan(0);
  }, 60000); // 60 second timeout
});
