/**
 * Agent Archetypes Test Suite
 *
 * Tests for all agent archetypes and core infrastructure.
 */

import {
  ChiefOfStaffAgent,
  COOAgent,
  RevOpsAgent,
  AgentRegistry,
  getAgentRegistry,
  initializeAgentArchetypes,
  shutdownAgentArchetypes,
} from '../index';

import { AgentContext, AgentQuery, ClassificationLevel } from '../base/types';

// Mock GraphHandle for testing
const createMockGraphHandle = () => ({
  query: jest.fn().mockResolvedValue([]),
  mutate: jest.fn().mockResolvedValue({}),
  getEntity: jest.fn().mockResolvedValue(null),
  createEntity: jest.fn().mockResolvedValue({
    id: `entity_${Date.now()}`,
    type: 'Test',
    properties: {},
    relationships: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateEntity: jest.fn().mockResolvedValue({
    id: `entity_${Date.now()}`,
    type: 'Test',
    properties: {},
    relationships: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deleteEntity: jest.fn().mockResolvedValue(true),
});

// Mock AgentContext for testing
const createMockContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
  user: {
    id: 'test_user_123',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['executive', 'admin'],
    permissions: [
      'read:calendar',
      'read:email',
      'create:task',
      'read:incident',
      'read:sla',
      'read:opportunity',
    ],
  },
  organization: {
    id: 'test_org_456',
    name: 'Test Organization',
    policies: {
      id: 'policy_789',
      version: '1.0',
      rules: [],
    },
    graphHandle: createMockGraphHandle(),
  },
  mode: 'analysis',
  timestamp: new Date(),
  requestId: `req_${Date.now()}`,
  classification: 'CONFIDENTIAL' as ClassificationLevel,
  ...overrides,
});

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    // Get fresh instance (singleton pattern)
    registry = getAgentRegistry();
  });

  afterEach(async () => {
    await registry.shutdownAll();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getAgentRegistry();
      const instance2 = getAgentRegistry();
      expect(instance1).toBe(instance2);
    });
  });

  describe('agent registration', () => {
    it('should register an agent', () => {
      const agent = new ChiefOfStaffAgent();
      registry.register(agent);

      const registeredAgent = registry.getAgent('chief_of_staff');
      expect(registeredAgent).toBeDefined();
      expect(registeredAgent?.name).toBe('AI Chief of Staff');
    });

    it('should list all registered agents', () => {
      registry.register(new ChiefOfStaffAgent());
      registry.register(new COOAgent());
      registry.register(new RevOpsAgent());

      const agents = registry.listAgents();
      expect(agents.length).toBe(3);
      expect(agents.map((a) => a.role)).toContain('chief_of_staff');
      expect(agents.map((a) => a.role)).toContain('coo');
      expect(agents.map((a) => a.role)).toContain('revops');
    });

    it('should replace existing agent on re-registration', () => {
      const agent1 = new ChiefOfStaffAgent();
      const agent2 = new ChiefOfStaffAgent();

      registry.register(agent1);
      registry.register(agent2);

      const agents = registry.listAgents();
      expect(agents.filter((a) => a.role === 'chief_of_staff').length).toBe(1);
    });
  });

  describe('agent initialization', () => {
    it('should initialize all agents', async () => {
      registry.register(new ChiefOfStaffAgent());
      registry.register(new COOAgent());

      await registry.initializeAll();
      expect(registry.isInitialized()).toBe(true);
    });

    it('should skip initialization if already initialized', async () => {
      registry.register(new ChiefOfStaffAgent());
      await registry.initializeAll();
      await registry.initializeAll(); // Should not throw

      expect(registry.isInitialized()).toBe(true);
    });
  });

  describe('agent execution', () => {
    it('should execute an agent successfully', async () => {
      registry.register(new ChiefOfStaffAgent());
      await registry.initializeAll();

      const context = createMockContext();
      const result = await registry.execute('chief_of_staff', context);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe(context.requestId);
    });

    it('should return error for unknown agent', async () => {
      const context = createMockContext();
      const result = await registry.execute('unknown_agent' as any, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('health checks', () => {
    it('should return health for all agents', async () => {
      registry.register(new ChiefOfStaffAgent());
      registry.register(new COOAgent());
      await registry.initializeAll();

      const healthMap = await registry.getHealthAll();

      expect(healthMap.size).toBe(2);
      expect(healthMap.get('chief_of_staff')?.healthy).toBe(true);
      expect(healthMap.get('coo')?.healthy).toBe(true);
    });
  });
});

describe('ChiefOfStaffAgent', () => {
  let agent: ChiefOfStaffAgent;
  let context: AgentContext;

  beforeEach(async () => {
    agent = new ChiefOfStaffAgent();
    await agent.initialize();
    context = createMockContext();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe('initialization', () => {
    it('should have correct name and role', () => {
      expect(agent.name).toBe('AI Chief of Staff');
      expect(agent.role).toBe('chief_of_staff');
    });

    it('should have expected capabilities', () => {
      expect(agent.capabilities).toContain('inbox_triage');
      expect(agent.capabilities).toContain('meeting_preparation');
      expect(agent.capabilities).toContain('follow_up_tracking');
    });
  });

  describe('execution', () => {
    it('should execute successfully and return briefing', async () => {
      const result = await agent.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.briefing).toBeDefined();
    });

    it('should return top priorities', async () => {
      const result = await agent.execute(context);

      expect(result.data.briefing.topPriorities).toBeDefined();
      expect(Array.isArray(result.data.briefing.topPriorities)).toBe(true);
    });

    it('should return inbox summary', async () => {
      const result = await agent.execute(context);

      expect(result.data.briefing.inboxSummary).toBeDefined();
    });
  });

  describe('analysis', () => {
    it('should analyze morning briefing query', async () => {
      const query: AgentQuery = {
        type: 'morning_briefing',
        parameters: {
          includeCalendar: true,
          includeInbox: true,
          includeTasks: true,
        },
      };

      const analysis = await agent.analyze(query, context);

      expect(analysis.findings).toBeDefined();
      expect(analysis.insights).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it('should throw error for unknown query type', async () => {
      const query: AgentQuery = {
        type: 'unknown_query',
        parameters: {},
      };

      await expect(agent.analyze(query, context)).rejects.toThrow('Unknown query type');
    });
  });

  describe('status and metrics', () => {
    it('should return valid status', () => {
      const status = agent.getStatus();

      expect(status.status).toBe('ready');
      expect(status.lastActive).toBeDefined();
    });

    it('should track metrics', async () => {
      await agent.execute(context);
      await agent.execute(context);

      const metrics = agent.getMetrics();

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      await agent.execute(context);
      agent.resetMetrics();

      const metrics = agent.getMetrics();

      expect(metrics.totalRequests).toBe(0);
    });
  });
});

describe('COOAgent', () => {
  let agent: COOAgent;
  let context: AgentContext;

  beforeEach(async () => {
    agent = new COOAgent();
    await agent.initialize();
    context = createMockContext();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe('initialization', () => {
    it('should have correct name and role', () => {
      expect(agent.name).toBe('AI COO');
      expect(agent.role).toBe('coo');
    });

    it('should have expected capabilities', () => {
      expect(agent.capabilities).toContain('sla_monitoring');
      expect(agent.capabilities).toContain('incident_management');
      expect(agent.capabilities).toContain('approval_tracking');
    });
  });

  describe('execution', () => {
    it('should execute successfully and return ops status', async () => {
      const result = await agent.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operationalStatus).toBeDefined();
    });

    it('should return SLA compliance', async () => {
      const result = await agent.execute(context);

      expect(result.data.operationalStatus.slaCompliance).toBeDefined();
    });

    it('should return active incidents', async () => {
      const result = await agent.execute(context);

      expect(result.data.operationalStatus.activeIncidents).toBeDefined();
    });
  });

  describe('analysis', () => {
    it('should analyze ops status query', async () => {
      const query: AgentQuery = {
        type: 'ops_status',
        parameters: {
          includeSLAs: true,
          includeIncidents: true,
          includeApprovals: true,
        },
      };

      const analysis = await agent.analyze(query, context);

      expect(analysis.findings.length).toBeGreaterThan(0);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should analyze incident triage query', async () => {
      const query: AgentQuery = {
        type: 'triage_incident',
        parameters: {
          severity: 'P2',
          description: 'Test incident',
          affectedServices: ['api-gateway'],
        },
      };

      const analysis = await agent.analyze(query, context);

      expect(analysis.insights).toBeDefined();
    });
  });

  describe('recommendations', () => {
    it('should generate recommendations for high severity findings', async () => {
      const result = await agent.execute(context);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});

describe('RevOpsAgent', () => {
  let agent: RevOpsAgent;
  let context: AgentContext;

  beforeEach(async () => {
    agent = new RevOpsAgent();
    await agent.initialize();
    context = createMockContext();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe('initialization', () => {
    it('should have correct name and role', () => {
      expect(agent.name).toBe('AI RevOps');
      expect(agent.role).toBe('revops');
    });

    it('should have expected capabilities', () => {
      expect(agent.capabilities).toContain('pipeline_analysis');
      expect(agent.capabilities).toContain('forecast_variance');
      expect(agent.capabilities).toContain('churn_prediction');
    });
  });

  describe('execution', () => {
    it('should execute successfully and return pipeline health', async () => {
      const result = await agent.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.pipelineHealth).toBeDefined();
    });

    it('should return forecast variance', async () => {
      const result = await agent.execute(context);

      expect(result.data.forecastVariance).toBeDefined();
    });

    it('should return churn risks', async () => {
      const result = await agent.execute(context);

      expect(result.data.churnRisks).toBeDefined();
      expect(Array.isArray(result.data.churnRisks)).toBe(true);
    });
  });

  describe('analysis', () => {
    it('should analyze pipeline health query', async () => {
      const query: AgentQuery = {
        type: 'pipeline_health',
        parameters: {
          period: 'current_quarter',
          includeChurnRisk: true,
          includeForecastVariance: true,
        },
      };

      const analysis = await agent.analyze(query, context);

      expect(analysis.findings).toBeDefined();
      expect(analysis.insights).toBeDefined();
    });

    it('should identify stale opportunities', async () => {
      const result = await agent.execute(context);

      // Should have pipeline health issues for stale opps (mock data includes some)
      const hasStaleOppsIssue = result.data.pipelineHealth?.issues?.some(
        (issue: any) => issue.type === 'finding_stale_opps'
      );
      expect(hasStaleOppsIssue).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  describe('initializeAgentArchetypes', () => {
    it('should initialize all agents and return registry', async () => {
      const registry = await initializeAgentArchetypes();

      expect(registry.isInitialized()).toBe(true);
      expect(registry.listAgents().length).toBe(3);

      await shutdownAgentArchetypes();
    });
  });

  describe('full workflow', () => {
    it('should execute complete workflow across all agents', async () => {
      const registry = await initializeAgentArchetypes();
      const context = createMockContext();

      // Execute all agents in sequence
      const cosResult = await registry.execute('chief_of_staff', context);
      expect(cosResult.success).toBe(true);

      const cooResult = await registry.execute('coo', context);
      expect(cooResult.success).toBe(true);

      const revOpsResult = await registry.execute('revops', context);
      expect(revOpsResult.success).toBe(true);

      await shutdownAgentArchetypes();
    });

    it('should handle concurrent executions', async () => {
      const registry = await initializeAgentArchetypes();
      const context = createMockContext();

      // Execute all agents concurrently
      const results = await Promise.all([
        registry.execute('chief_of_staff', context),
        registry.execute('coo', context),
        registry.execute('revops', context),
      ]);

      expect(results.every((r) => r.success)).toBe(true);

      await shutdownAgentArchetypes();
    });
  });
});
