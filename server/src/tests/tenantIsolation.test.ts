import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntelGraphService } from '../services/IntelGraphService.js';
import * as neo4j from '../graph/neo4j.js';
import { applyPolicyToContext, DefaultPolicyEngine, filterEvidenceByPolicy } from '../services/graphrag/policy-guard.js';
import { EvidenceSnippet, GraphContext, UserContext } from '../services/graphrag/types.js';

jest.mock('../graph/neo4j.js');

describe('Tenant isolation regressions', () => {
  const mockRunCypher = neo4j.runCypher as jest.MockedFunction<typeof neo4j.runCypher>;
  let service: IntelGraphService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = IntelGraphService.getInstance();
  });

  it('rejects graph lookups across tenant boundaries', async () => {
    const tenantRequester = 'tenant-alpha';
    const foreignNodeId = 'node-owned-by-beta';

    mockRunCypher.mockImplementation(async (cypher: string, params: Record<string, any>) => {
      expect(cypher).toContain('n.tenantId = $tenantId');
      expect(params.tenantId).toBe(tenantRequester);
      expect(params.id).toBe(foreignNodeId);
      return [] as any[];
    });

    const result = await service.getNodeById(tenantRequester, foreignNodeId);

    expect(result).toBeNull();
    expect(mockRunCypher).toHaveBeenCalledTimes(1);
  });

  it('enforces tenant predicates on node searches and returns only tenant-scoped results', async () => {
    const tenantId = 'tenant-zeta';
    const criteria = { name: 'Redacted Asset' };

    mockRunCypher.mockImplementation(async (cypher: string, params: Record<string, any>) => {
      expect(cypher).toContain('n.tenantId = $tenantId');
      expect(cypher).not.toMatch(/tenant\s*=\s*['"]tenant-beta['"]/i);
      expect(params.tenantId).toBe(tenantId);
      expect(params.name).toBe(criteria.name);

      return [
        { n: { id: 'node-1', tenantId, label: 'Entity' } },
        { n: { id: 'node-2', tenantId, label: 'Entity' } },
      ] as any[];
    });

    const results = await service.searchNodes(tenantId, 'Entity', criteria, 10);

    expect(results).toHaveLength(2);
    expect(results.every((node) => node.tenantId === tenantId)).toBe(true);
    expect(mockRunCypher).toHaveBeenCalledTimes(1);
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
    expect(filterReasons.get('ev-cross-tenant')).toMatch(/tenant/i);
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
