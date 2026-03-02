import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock LLMService using unstable_mockModule for ESM
jest.unstable_mockModule('../LLMService.js', () => ({
  default: class MockLLMService {
    constructor() {}
    async complete() {
      return {
        content: JSON.stringify({
          title: "Test Playbook",
          summary: "Test Summary",
          score: 90,
          strengths: ["Strength 1"],
          weaknesses: ["Weakness 1"],
          strategic_initiatives: [],
          tactical_actions: []
        }),
        usage: { total_tokens: 100 }
      };
    }
  }
}));

// We also need to mock metrics to prevent the SyntaxError/import issues in the underlying chain
// even if LLMService is mocked, sometimes the module graph is traversed.
jest.unstable_mockModule('../../monitoring/metrics.js', () => ({
    narrativeSimulationActiveSimulations: { inc: jest.fn(), dec: jest.fn(), set: jest.fn() },
    metrics: {},
    // Minimal exports to satisfy re-exports if touched
    register: { registerMetric: jest.fn() },
    jobsProcessed: {},
    outboxSyncLatency: {},
    activeConnections: {},
    databaseQueryDuration: {},
    httpRequestDuration: {},
    graphragQueryTotal: {},
    graphragQueryDurationMs: {},
    queryPreviewsTotal: {},
    queryPreviewLatencyMs: {},
    queryPreviewErrorsTotal: {},
    queryPreviewExecutionsTotal: {},
    glassBoxRunsTotal: {},
    glassBoxRunDurationMs: {},
    glassBoxCacheHits: {},
    cacheHits: {},
    cacheMisses: {},
    copilotApiRequestTotal: {},
    copilotApiRequestDurationMs: {},
    maestroDagExecutionDurationSeconds: {},
    maestroJobExecutionDurationSeconds: {},
    llmTokensTotal: {},
    llmRequestDuration: {},
    intelgraphCacheHits: {},
    intelgraphCacheMisses: {},
    intelgraphActiveConnections: {},
    intelgraphDatabaseQueryDuration: {},
    intelgraphHttpRequestDuration: {},
    intelgraphGraphragQueryTotal: {},
    intelgraphGraphragQueryDurationMs: {},
    intelgraphQueryPreviewsTotal: {},
    intelgraphQueryPreviewLatencyMs: {},
    intelgraphQueryPreviewErrorsTotal: {},
    intelgraphQueryPreviewExecutionsTotal: {},
    intelgraphGlassBoxRunsTotal: {},
    intelgraphGlassBoxRunDurationMs: {},
    intelgraphGlassBoxCacheHits: {},
    goldenPathStepTotal: {},
    uiErrorBoundaryCatchTotal: {},
    maestroDeploymentsTotal: {},
    maestroPrLeadTimeHours: {},
    maestroChangeFailureRate: {},
    maestroMttrHours: {},
    stdHttpRequestsTotal: {},
    stdHttpRequestDuration: {},
    websocketConnections: {},
    narrativeSimulationTicksTotal: {},
    narrativeSimulationEventsTotal: {},
    narrativeSimulationDurationSeconds: {}
}));

describe('GrowthPlaybookService', () => {
  let service: any;

  beforeEach(async () => {
    // Dynamic import to ensure mocks are applied
    const { GrowthPlaybookService } = await import('../GrowthPlaybookService.js');
    service = new GrowthPlaybookService();
  });

  it('should generate a playbook', async () => {
    const profile = {
      name: 'Acme Corp',
      industry: 'Tech',
      stage: 'growth' as const,
      employees: 50,
      revenue: 5000000,
      challenges: ['Scale'],
      goals: ['IPO']
    };

    const result = await service.generatePlaybook(profile);

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Playbook');
    expect(result.score).toBe(90);
  });
});
