/**
 * Integration Tests for Simulation Harness
 * These tests validate the end-to-end workflow
 */

import {
  ScenarioGenerator,
  GhostAnalyst,
  MetricsCollector,
  ComparisonReporter,
  ConfigLoader,
  ScenarioParameters,
  Workflow,
  WorkflowStep,
} from '../src/index';

describe('Simulation Harness Integration', () => {
  const testConfig = ConfigLoader.getDefaults();

  // Skip integration tests unless explicitly requested
  const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
  const testFn = runIntegration ? it : it.skip;

  testFn('should complete full fraud ring scenario workflow', async () => {
    // 1. Generate scenario
    const generator = new ScenarioGenerator(42);
    const params: ScenarioParameters = {
      type: 'fraud-ring',
      size: 'small',
      noiseLevel: 0.1,
      missingDataRate: 0.05,
      conflictingEvidenceRate: 0.03,
      seed: 42,
    };

    const scenarioData = await generator.generate(params);

    expect(scenarioData.entities.length).toBeGreaterThan(0);
    expect(scenarioData.relationships.length).toBeGreaterThan(0);

    // 2. Create workflow
    const steps: WorkflowStep[] = [
      {
        type: 'CREATE_INVESTIGATION',
        params: {},
      },
    ];

    // Add first few entities
    for (let i = 0; i < Math.min(5, scenarioData.entities.length); i++) {
      steps.push({
        type: 'ADD_ENTITY',
        params: { entityIndex: i },
      });
    }

    // Add first few relationships
    for (let i = 0; i < Math.min(5, scenarioData.relationships.length); i++) {
      steps.push({
        type: 'ADD_RELATIONSHIP',
        params: { relationshipIndex: i },
      });
    }

    steps.push(
      {
        type: 'QUERY_ENTITIES',
        params: {},
      },
      {
        type: 'QUERY_RELATIONSHIPS',
        params: {},
      }
    );

    const workflow: Workflow = {
      name: 'Integration Test Workflow',
      description: 'Test workflow for integration testing',
      steps,
      strategy: 'systematic',
    };

    // 3. Run ghost analyst
    const analyst = new GhostAnalyst(testConfig);
    const session = await analyst.runWorkflow(workflow, scenarioData);

    // 4. Verify results
    expect(session.state.completed).toBe(true);
    expect(session.state.failed).toBe(false);
    expect(session.state.investigationId).toBeDefined();
    expect(session.metrics.tasksCompleted).toBeGreaterThan(0);
    expect(session.metrics.successRate).toBeGreaterThan(0);

    // 5. Verify metrics
    const metricsCollector = analyst.getMetricsCollector();
    const allMetrics = metricsCollector.getAllMetrics();

    expect(allMetrics.length).toBeGreaterThan(0);
    expect(allMetrics[0].sessionId).toBe(session.id);
  }, 60000); // 60 second timeout

  testFn('should generate comparison report', async () => {
    // Create mock baseline and candidate metrics
    const baselineMetrics = [
      {
        sessionId: 'baseline-1',
        scenarioType: 'fraud-ring' as const,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 10000,
        tasksCompleted: 10,
        tasksFailed: 0,
        successRate: 1.0,
        totalQueries: 10,
        averageQueryTime: 100,
        entitiesExplored: 20,
        entitiesTotal: 20,
        coverageRate: 1.0,
        relationshipsExplored: 15,
        relationshipsTotal: 15,
        keyEntitiesFound: 5,
        keyEntitiesExpected: 5,
        precision: 1.0,
        recall: 1.0,
        f1Score: 1.0,
        copilotQueriesCount: 2,
        copilotSuccessRate: 1.0,
        copilotAverageResponseTime: 2000,
        errors: [],
      },
    ];

    const candidateMetrics = [
      {
        ...baselineMetrics[0],
        sessionId: 'candidate-1',
        duration: 8000,
        averageQueryTime: 80,
        f1Score: 0.95,
      },
    ];

    const reporter = new ComparisonReporter();
    const report = reporter.generateComparison(
      {
        version: 'v1.0.0',
        metrics: baselineMetrics,
      },
      {
        version: 'v1.1.0',
        metrics: candidateMetrics,
      }
    );

    expect(report.baseline.version).toBe('v1.0.0');
    expect(report.candidate.version).toBe('v1.1.0');
    expect(report.comparison.performanceDelta).toBeGreaterThan(0); // Improvement
    expect(report.comparison.improvements.length).toBeGreaterThan(0);
  });

  describe('Configuration Management', () => {
    it('should load default configuration', () => {
      const config = ConfigLoader.getDefaults();

      expect(config.api.baseUrl).toBeDefined();
      expect(config.safety.nonProdOnly).toBe(true);
      expect(config.scenarios.deterministic).toBe(true);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        scenarios: {
          defaultSize: 'large' as const,
        },
      };

      const merged = ConfigLoader.mergeWithDefaults(customConfig);

      expect(merged.scenarios.defaultSize).toBe('large');
      expect(merged.api.baseUrl).toBeDefined(); // From defaults
      expect(merged.safety.nonProdOnly).toBe(true); // From defaults
    });

    it('should validate safe configuration', () => {
      const config = ConfigLoader.getDefaults();

      expect(() => {
        ConfigLoader.validate(config);
      }).not.toThrow();
    });

    it('should reject unsafe configuration', () => {
      const unsafeConfig = {
        ...ConfigLoader.getDefaults(),
        safety: {
          ...ConfigLoader.getDefaults().safety,
          nonProdOnly: false,
        },
      };

      expect(() => {
        ConfigLoader.validate(unsafeConfig);
      }).toThrow();
    });
  });

  describe('Scenario Generation Consistency', () => {
    it('should generate consistent scenarios across types', async () => {
      const generator = new ScenarioGenerator(12345);
      const scenarioTypes = [
        'fraud-ring',
        'terror-cell',
        'corruption-network',
        'supply-chain',
        'money-laundering',
      ] as const;

      for (const type of scenarioTypes) {
        const params: ScenarioParameters = {
          type,
          size: 'small',
          noiseLevel: 0.1,
          missingDataRate: 0.05,
          conflictingEvidenceRate: 0.03,
        };

        const scenario = await generator.generate(params);

        expect(scenario.entities.length).toBeGreaterThan(0);
        expect(scenario.relationships.length).toBeGreaterThan(0);
        expect(scenario.investigation).toBeDefined();
        expect(scenario.copilotGoal).toBeDefined();
        expect(scenario.metadata).toBeDefined();
      }
    });
  });
});
