import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { EvidenceSnippet, GraphContext, UserContext } from '../services/graphrag/types.js';
import { applyPolicyToContext, DefaultPolicyEngine, filterEvidenceByPolicy } from '../services/graphrag/policy-guard.js';

const mockGetNeo4jDriver = jest.fn();

type IntelGraphServiceType = typeof import('../services/IntelGraphService.js').IntelGraphService;
let IntelGraphService: IntelGraphServiceType;

describe('Tenant isolation regressions', () => {
  const mockRun = jest.fn() as jest.Mock;
  const mockSession = {
    run: mockRun,
    close: jest.fn(),
  };
  const mockDriver = {
    session: jest.fn(() => mockSession),
  };
  let service: ReturnType<IntelGraphServiceType['getInstance']>;

  beforeEach(async () => {
    jest.resetModules();
    await jest.unstable_mockModule('../config/database', () => ({
      getNeo4jDriver: mockGetNeo4jDriver,
    }));

    await jest.unstable_mockModule('prom-client', () => {
      class Registry {
        clear = jest.fn();
        getSingleMetric = jest.fn(() => undefined);
      }

      return {
        Registry,
        collectDefaultMetrics: jest.fn(() => ({ clear: jest.fn() })),
        Counter: jest.fn().mockImplementation(() => ({ inc: jest.fn() })),
        Gauge: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
        Histogram: jest.fn().mockImplementation(() => ({
          startTimer: jest.fn(() => () => {}),
          observe: jest.fn(),
        })),
        register: {
          getSingleMetric: jest.fn(() => undefined),
          registerMetric: jest.fn(),
          clear: jest.fn(),
        },
      };
    });

    ({ IntelGraphService } = await import('../services/IntelGraphService.js'));
    jest.clearAllMocks();
    IntelGraphService._resetForTesting();
    mockDriver.session = jest.fn(() => mockSession);
    mockGetNeo4jDriver.mockReturnValue(mockDriver as any);
    service = IntelGraphService.getInstance();
    (service as any).driver = mockDriver;
  });

  it('rejects graph lookups across tenant boundaries', async () => {
    const tenantRequester = 'tenant-alpha';
    const foreignNodeId = 'node-owned-by-beta';

    mockRun.mockImplementation(async (cypher: any, params?: any) => {
      expect(cypher).toContain('tenantId');
      expect(params?.tenantId).toBe(tenantRequester);
      expect(params?.nodeId).toBe(foreignNodeId);
      return { records: [] } as any;
    });

    const result = await service.getNodeById(tenantRequester, foreignNodeId);

    expect(result).toBeUndefined();
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('enforces tenant predicates on node searches and returns only tenant-scoped results', async () => {
    const tenantId = 'tenant-zeta';
    const criteria = { name: 'Redacted Asset' };

    mockRun.mockImplementation(async (cypher: any, params?: any) => {
      expect(cypher).toContain('n.tenantId = $tenantId');
      expect(cypher).not.toMatch(/tenant\s*=\s*['"]tenant-beta['"]/i);
      expect(params?.tenantId).toBe(tenantId);

      return {
        records: [
          { get: () => ({ properties: { id: 'node-1', tenantId, label: 'Entity' } }) },
          { get: () => ({ properties: { id: 'node-2', tenantId, label: 'Entity' } }) },
        ],
      } as any;
    });

    const results = await service.findSimilarNodes(tenantId, 'Entity', criteria, 10);

    expect(results).toHaveLength(2);
    expect(results.every((node: { tenantId?: string }) => node.tenantId === tenantId)).toBe(true);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('filters evidence that belongs to another tenant', () => {
    const user: UserContext = {
      userId: 'user-1',
      tenantId: 'tenant-b',
      roles: [],
      clearances: [],
    };

    const snippets: EvidenceSnippet[] = [
      {
        evidenceId: 'ev-cross-tenant',
        snippet: 'foreign evidence',
        score: 0.9,
        classification: 'CONFIDENTIAL',
        metadata: { tenantId: 'tenant-a' },
      },
    ];

    const engine = new DefaultPolicyEngine();

    const { allowed, filtered, filterReasons } = filterEvidenceByPolicy(snippets, user, engine);

    expect(allowed).toHaveLength(0);
    expect(filtered).toHaveLength(1);
    expect(filterReasons.get('ev-cross-tenant')).toBeDefined();
    expect(filterReasons.get('ev-cross-tenant')).not.toMatch(/tenant-a/);
  });

  it('denies claim visibility across tenants with a generic reason', () => {
    const engine = new DefaultPolicyEngine();
    const user: UserContext = {
      userId: 'reviewer',
      tenantId: 'tenant-alpha',
      roles: [],
      clearances: [],
    };

    const decision = engine.canViewClaim({
      user,
      claimId: 'claim-1',
      metadata: { tenantId: 'tenant-beta', classification: 'PUBLIC' },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toMatch(/different tenant/i);
    expect(decision.reason).not.toContain('tenant-beta');
  });

  it('removes cross-tenant evidence from graph context responses', () => {
    const engine = new DefaultPolicyEngine();
    const user: UserContext = {
      userId: 'user-2',
      tenantId: 'tenant-alpha',
      roles: [],
      clearances: [],
    };

    const context: GraphContext = {
      nodes: [
        { id: 'n1', label: 'Entity', properties: { tenantId: 'tenant-alpha' } },
        { id: 'n2', label: 'Entity', properties: { tenantId: 'tenant-beta' } },
      ],
      edges: [],
      evidenceSnippets: [
        {
          evidenceId: 'ev-same-tenant',
          snippet: 'local evidence',
          score: 0.8,
          classification: 'PUBLIC',
          metadata: { tenantId: 'tenant-alpha' },
        },
        {
          evidenceId: 'ev-foreign',
          snippet: 'other tenant evidence',
          score: 0.7,
          classification: 'PUBLIC',
          metadata: { tenantId: 'tenant-beta' },
        },
      ],
    };

    const { filteredContext, policyDecisions } = applyPolicyToContext(context, user, engine);

    expect(filteredContext.evidenceSnippets).toHaveLength(1);
    expect(filteredContext.evidenceSnippets[0].evidenceId).toBe('ev-same-tenant');
    expect(policyDecisions.allowedEvidenceCount).toBe(1);
    expect(policyDecisions.filteredEvidenceCount).toBe(1);
  });
});
