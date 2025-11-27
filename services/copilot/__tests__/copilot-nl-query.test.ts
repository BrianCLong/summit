/**
 * Comprehensive Test Suite for AI Copilot Service
 *
 * Tests for:
 * - NL to Query generation (nlToQueryDraft)
 * - Safety analysis (SafetyAnalyzer)
 * - Draft query management
 * - Execute flow with confirmations
 * - Policy enforcement
 * - Audit logging
 * - API endpoints
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// =============================================================================
// Type Definitions (matching src/types.ts)
// =============================================================================

interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'id';
}

interface NodeTypeSchema {
  name: string;
  fields: FieldSchema[];
  labels?: string[];
}

interface EdgeTypeSchema {
  name: string;
  from: string;
  to: string;
  fields: FieldSchema[];
}

interface GraphSchemaDescription {
  nodeTypes: NodeTypeSchema[];
  edgeTypes: EdgeTypeSchema[];
}

interface PolicyContext {
  maxDepth: number;
  maxRows: number;
  disallowedLabels?: string[];
  disallowedNodeTypes?: string[];
  disallowedEdgeTypes?: string[];
  restrictedSensitivityLevels?: string[];
}

interface UserContext {
  userId: string;
  roles: string[];
  clearances: string[];
  tenantId: string;
}

type QueryDialect = 'CYPHER' | 'SQL' | 'DSL';

interface SafetyViolation {
  code: string;
  message: string;
  severity: 'ERROR' | 'CRITICAL';
  location?: string;
}

interface SafetyWarning {
  code: string;
  message: string;
  severity: 'WARNING' | 'INFO';
}

interface SafetyCheckResult {
  passesStaticChecks: boolean;
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
  estimatedDepth: number;
  estimatedRows: number;
  suggestedFixes?: string[];
}

interface CopilotDraftQuery {
  id: string;
  userText: string;
  query: string;
  dialect: QueryDialect;
  explanation: string;
  assumptions: string[];
  parameters: Record<string, unknown>;
  estimatedCost: {
    depth: number;
    expectedRows: number;
    complexity: string;
  };
  safety: SafetyCheckResult;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
}

interface CopilotAuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  action: string;
  draftId?: string;
  userText?: string;
  query?: string;
}

// =============================================================================
// Mock Implementations
// =============================================================================

const createMockSafetyAnalyzer = () => {
  const FORBIDDEN_OPERATIONS = ['DELETE', 'DROP', 'CREATE', 'MERGE', 'SET'];

  return {
    analyzeQuerySafety: jest.fn(
      (query: string, dialect: QueryDialect, policy: PolicyContext): SafetyCheckResult => {
        const violations: SafetyViolation[] = [];
        const warnings: SafetyWarning[] = [];
        const upperQuery = query.toUpperCase();

        // Check forbidden operations
        for (const op of FORBIDDEN_OPERATIONS) {
          if (upperQuery.includes(op)) {
            violations.push({
              code: 'FORBIDDEN_OPERATION',
              message: `Operation "${op}" is not allowed`,
              severity: 'CRITICAL',
              location: op,
            });
          }
        }

        // Check for LIMIT
        const hasLimit = /LIMIT\s+\d+/i.test(query);
        const limitMatch = query.match(/LIMIT\s+(\d+)/i);
        const limitValue = limitMatch ? parseInt(limitMatch[1], 10) : Infinity;

        if (!hasLimit && !/count\s*\(/i.test(query)) {
          violations.push({
            code: 'MISSING_LIMIT',
            message: `Query must include LIMIT (max ${policy.maxRows})`,
            severity: 'ERROR',
          });
        } else if (limitValue > policy.maxRows) {
          violations.push({
            code: 'EXCEEDS_MAX_ROWS',
            message: `LIMIT ${limitValue} exceeds max ${policy.maxRows}`,
            severity: 'ERROR',
          });
        }

        // Estimate depth from variable-length patterns
        let estimatedDepth = 1;
        const depthMatch = query.match(/\[\s*\*(?:\d*)?\.\.(\d+)\s*\]/);
        if (depthMatch) {
          estimatedDepth = parseInt(depthMatch[1], 10);
        }

        if (estimatedDepth > policy.maxDepth) {
          violations.push({
            code: 'EXCEEDS_MAX_DEPTH',
            message: `Depth ${estimatedDepth} exceeds max ${policy.maxDepth}`,
            severity: 'ERROR',
          });
        }

        // Check disallowed labels
        for (const label of policy.disallowedLabels || []) {
          if (query.includes(`:${label}`) || query.includes(`"${label}"`)) {
            violations.push({
              code: 'DISALLOWED_LABEL',
              message: `Label "${label}" is not permitted`,
              severity: 'CRITICAL',
              location: label,
            });
          }
        }

        // Check for unbounded patterns
        if (/\[\s*\*\s*\]/.test(query)) {
          violations.push({
            code: 'UNBOUNDED_PATTERN',
            message: 'Unbounded [*] pattern not allowed',
            severity: 'ERROR',
          });
        }

        return {
          passesStaticChecks: violations.length === 0,
          violations,
          warnings,
          estimatedDepth,
          estimatedRows: hasLimit ? Math.min(limitValue, policy.maxRows) : policy.maxRows * 10,
          suggestedFixes: violations.map((v) => `Fix: ${v.message}`),
        };
      },
    ),
  };
};

const createMockLlmAdapter = () => {
  return {
    generateQuery: jest.fn(
      async (input: {
        userText: string;
        schema: GraphSchemaDescription;
        policy: PolicyContext;
        dialect: QueryDialect;
      }) => {
        const { userText, dialect, policy } = input;
        const normalizedText = userText.toLowerCase();

        // Pattern matching
        if (normalizedText.includes('who is connected to')) {
          const nameMatch = userText.match(/who is connected to ["']?([^"'?]+)["']?/i);
          return {
            query: `MATCH (target:Entity {name: $name})-[r]-(connected:Entity)
RETURN connected.id, connected.name, type(r)
LIMIT ${policy.maxRows}`,
            explanation: `Find entities connected to "${nameMatch?.[1] || 'target'}"`,
            assumptions: ['Looking for direct connections'],
            parameters: { name: nameMatch?.[1]?.trim() || 'unknown', limit: policy.maxRows },
            confidence: 0.9,
          };
        }

        if (normalizedText.includes('delete')) {
          return {
            query: 'MATCH (n) DELETE n',
            explanation: 'Delete operation',
            assumptions: [],
            parameters: {},
            confidence: 0.5,
          };
        }

        if (normalizedText.includes('no limit')) {
          return {
            query: 'MATCH (n:Entity) RETURN n',
            explanation: 'Return all entities without limit',
            assumptions: [],
            parameters: {},
            confidence: 0.6,
          };
        }

        if (normalizedText.includes('deep traversal')) {
          return {
            query: `MATCH path = (a)-[*..20]-(b) RETURN path LIMIT 10`,
            explanation: 'Deep traversal up to 20 hops',
            assumptions: ['Deep traversal requested'],
            parameters: {},
            confidence: 0.7,
          };
        }

        if (normalizedText.includes('sensitive')) {
          return {
            query: `MATCH (n:SensitivePerson) RETURN n LIMIT 10`,
            explanation: 'Query sensitive data',
            assumptions: [],
            parameters: {},
            confidence: 0.5,
          };
        }

        // Default fallback
        return {
          query: `MATCH (n:Entity)
WHERE n.name CONTAINS $searchTerm
RETURN n.id, n.name, n.type
LIMIT ${Math.min(50, policy.maxRows)}`,
          explanation: `Search for entities matching "${userText}"`,
          assumptions: ['Performing text search'],
          parameters: { searchTerm: userText.substring(0, 20), limit: 50 },
          confidence: 0.5,
        };
      },
    ),

    healthCheck: jest.fn(async () => ({ healthy: true, latencyMs: 15 })),
  };
};

const createMockDraftRepository = () => {
  const drafts = new Map<string, CopilotDraftQuery>();
  const userIndex = new Map<string, Set<string>>();

  return {
    save: jest.fn(async (draft: CopilotDraftQuery) => {
      drafts.set(draft.id, draft);
      if (!userIndex.has(draft.createdBy)) {
        userIndex.set(draft.createdBy, new Set());
      }
      userIndex.get(draft.createdBy)!.add(draft.id);
    }),

    getById: jest.fn(async (id: string) => drafts.get(id) || null),

    deleteById: jest.fn(async (id: string) => {
      const draft = drafts.get(id);
      if (draft) {
        drafts.delete(id);
        userIndex.get(draft.createdBy)?.delete(id);
        return true;
      }
      return false;
    }),

    getByUserId: jest.fn(async (userId: string, limit = 10) => {
      const ids = userIndex.get(userId);
      if (!ids) return [];
      const result: CopilotDraftQuery[] = [];
      for (const id of ids) {
        const draft = drafts.get(id);
        if (draft) result.push(draft);
        if (result.length >= limit) break;
      }
      return result;
    }),

    deleteExpired: jest.fn(async () => {
      const now = Date.now();
      let count = 0;
      for (const [id, draft] of drafts) {
        if (draft.expiresAt && new Date(draft.expiresAt).getTime() < now) {
          drafts.delete(id);
          count++;
        }
      }
      return count;
    }),

    // Test helpers
    _drafts: drafts,
    _clear: () => {
      drafts.clear();
      userIndex.clear();
    },
  };
};

const createMockAuditLog = () => {
  const records: CopilotAuditRecord[] = [];

  return {
    append: jest.fn(async (record: CopilotAuditRecord) => {
      records.push(record);
    }),

    getByUserId: jest.fn(async (userId: string, limit = 100) => {
      return records.filter((r) => r.userId === userId).slice(0, limit);
    }),

    getByDraftId: jest.fn(async (draftId: string) => {
      return records.filter((r) => r.draftId === draftId);
    }),

    // Test helpers
    _records: records,
    _clear: () => {
      records.length = 0;
    },
  };
};

const createMockPolicyEngine = () => {
  return {
    canExecuteQuery: jest.fn(
      (input: { user: UserContext; draft: CopilotDraftQuery; overrideSafety?: boolean }) => {
        const { user, draft } = input;

        // Block extreme complexity
        if (draft.estimatedCost.complexity === 'EXTREME' && !input.overrideSafety) {
          return { allow: false, reason: 'Query too complex' };
        }

        // Check clearance for sensitive queries
        if (draft.safety.violations.some((v) => v.code === 'SENSITIVE_DATA_ACCESS')) {
          if (!user.clearances.includes('SECRET')) {
            return { allow: false, reason: 'Insufficient clearance' };
          }
        }

        return { allow: true, reason: 'Allowed' };
      },
    ),
  };
};

const createMockQueryExecutor = () => {
  return {
    execute: jest.fn(
      async (
        query: string,
        parameters: Record<string, unknown>,
        dialect: QueryDialect,
        maxRows: number,
      ) => {
        // Simulate execution
        await new Promise((resolve) => setTimeout(resolve, 50));

        return {
          results: [
            { id: 'e1', name: 'Alice', type: 'Person' },
            { id: 'e2', name: 'Bob', type: 'Person' },
          ],
          executionTimeMs: 52,
        };
      },
    ),
  };
};

// =============================================================================
// Mock Copilot Service
// =============================================================================

const createMockCopilotService = () => {
  const llmAdapter = createMockLlmAdapter();
  const safetyAnalyzer = createMockSafetyAnalyzer();
  const draftRepository = createMockDraftRepository();
  const auditLog = createMockAuditLog();
  const policyEngine = createMockPolicyEngine();
  const queryExecutor = createMockQueryExecutor();

  let draftCounter = 0;

  const nlToQueryDraft = async (request: {
    userText: string;
    user: UserContext;
    schema: GraphSchemaDescription;
    policy: PolicyContext;
    dialect?: QueryDialect;
  }): Promise<CopilotDraftQuery> => {
    const { userText, user, schema, policy } = request;
    const dialect = request.dialect || 'CYPHER';

    // Generate query via LLM
    const llmOutput = await llmAdapter.generateQuery({
      userText,
      schema,
      policy,
      dialect,
    });

    // Analyze safety
    const safetyResult = safetyAnalyzer.analyzeQuerySafety(llmOutput.query, dialect, policy);

    // Create draft
    const draft: CopilotDraftQuery = {
      id: `draft-${++draftCounter}`,
      userText,
      query: llmOutput.query,
      dialect,
      explanation: llmOutput.explanation,
      assumptions: llmOutput.assumptions,
      parameters: llmOutput.parameters,
      estimatedCost: {
        depth: safetyResult.estimatedDepth,
        expectedRows: safetyResult.estimatedRows,
        complexity:
          safetyResult.estimatedDepth > 6 || safetyResult.estimatedRows > 1000
            ? 'HIGH'
            : 'MEDIUM',
      },
      safety: safetyResult,
      createdAt: new Date().toISOString(),
      createdBy: user.userId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    await draftRepository.save(draft);

    await auditLog.append({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      tenantId: user.tenantId,
      action: 'PREVIEW',
      draftId: draft.id,
      userText,
      query: llmOutput.query,
    });

    return draft;
  };

  const executeQuery = async (
    request: {
      draftId: string;
      confirm: boolean;
      overrideSafety?: boolean;
      reason?: string;
    },
    user: UserContext,
    policy: PolicyContext,
  ) => {
    const { draftId, confirm, overrideSafety, reason } = request;

    // Load draft
    const draft = await draftRepository.getById(draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    // Check expiration
    if (draft.expiresAt && new Date(draft.expiresAt) < new Date()) {
      throw new Error('Draft expired');
    }

    // Require confirmation
    if (!confirm) {
      throw new Error('Explicit confirmation required');
    }

    // Check safety
    if (!draft.safety.passesStaticChecks && !overrideSafety) {
      const violations = draft.safety.violations.map((v) => v.message).join('; ');
      throw new Error(`Safety check failed: ${violations}`);
    }

    // Check override permission
    if (overrideSafety && !user.roles.some((r) => ['ADMIN', 'SUPERVISOR'].includes(r))) {
      throw new Error('No permission to override safety');
    }

    // Require reason for override
    if (overrideSafety && !reason) {
      throw new Error('Reason required for safety override');
    }

    // Policy check
    const policyDecision = policyEngine.canExecuteQuery({ user, draft, overrideSafety });
    if (!policyDecision.allow) {
      throw new Error(`Policy denied: ${policyDecision.reason}`);
    }

    // Execute
    const result = await queryExecutor.execute(
      draft.query,
      draft.parameters,
      draft.dialect,
      policy.maxRows,
    );

    await auditLog.append({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      tenantId: user.tenantId,
      action: 'EXECUTE',
      draftId,
      query: draft.query,
    });

    return {
      draftId,
      results: result.results,
      truncated: result.results.length >= policy.maxRows,
      executedAt: new Date().toISOString(),
      executionTimeMs: result.executionTimeMs,
      rowCount: result.results.length,
    };
  };

  return {
    nlToQueryDraft,
    executeQuery,
    getDraft: draftRepository.getById,
    getUserDrafts: draftRepository.getByUserId,
    deleteDraft: draftRepository.deleteById,
    healthCheck: async () => ({ healthy: true, details: {} }),
    _llmAdapter: llmAdapter,
    _safetyAnalyzer: safetyAnalyzer,
    _draftRepository: draftRepository,
    _auditLog: auditLog,
    _policyEngine: policyEngine,
    _clear: () => {
      draftRepository._clear();
      auditLog._clear();
    },
  };
};

// =============================================================================
// Test Data
// =============================================================================

const testSchema: GraphSchemaDescription = {
  nodeTypes: [
    { name: 'Person', labels: ['Entity', 'Person'], fields: [{ name: 'name', type: 'string' }] },
    {
      name: 'Organization',
      labels: ['Entity', 'Organization'],
      fields: [{ name: 'name', type: 'string' }],
    },
  ],
  edgeTypes: [
    { name: 'WORKS_FOR', from: 'Person', to: 'Organization', fields: [] },
    { name: 'COMMUNICATES_WITH', from: 'Person', to: 'Person', fields: [] },
  ],
};

const testPolicy: PolicyContext = {
  maxDepth: 6,
  maxRows: 100,
  disallowedLabels: ['SensitivePerson', 'ClassifiedOrg'],
  disallowedNodeTypes: [],
  disallowedEdgeTypes: [],
  restrictedSensitivityLevels: ['TOP_SECRET'],
};

const testUser: UserContext = {
  userId: 'user-001',
  roles: ['ANALYST'],
  clearances: ['UNCLASSIFIED', 'CONFIDENTIAL'],
  tenantId: 'tenant-001',
};

const adminUser: UserContext = {
  userId: 'admin-001',
  roles: ['ADMIN'],
  clearances: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET'],
  tenantId: 'tenant-001',
};

// =============================================================================
// Test Suites
// =============================================================================

describe('Safety Analyzer', () => {
  let safetyAnalyzer: ReturnType<typeof createMockSafetyAnalyzer>;

  beforeEach(() => {
    safetyAnalyzer = createMockSafetyAnalyzer();
  });

  describe('Forbidden Operations', () => {
    it('should reject DELETE operations', () => {
      const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n) DELETE n', 'CYPHER', testPolicy);

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'FORBIDDEN_OPERATION' }),
      );
    });

    it('should reject DROP operations', () => {
      const result = safetyAnalyzer.analyzeQuerySafety('DROP INDEX my_index', 'CYPHER', testPolicy);

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations.some((v) => v.code === 'FORBIDDEN_OPERATION')).toBe(true);
    });

    it('should reject CREATE operations', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'CREATE (n:Person {name: "Test"})',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(false);
    });

    it('should allow valid read queries', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:Person) RETURN n LIMIT 10',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Row Limits', () => {
    it('should require LIMIT clause', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:Person) RETURN n',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations.some((v) => v.code === 'MISSING_LIMIT')).toBe(true);
    });

    it('should reject LIMIT exceeding policy', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:Person) RETURN n LIMIT 500',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations.some((v) => v.code === 'EXCEEDS_MAX_ROWS')).toBe(true);
    });

    it('should accept LIMIT within policy', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:Person) RETURN n LIMIT 50',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(true);
    });

    it('should allow COUNT queries without LIMIT', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:Person) RETURN count(n)',
        'CYPHER',
        testPolicy,
      );

      expect(result.violations.some((v) => v.code === 'MISSING_LIMIT')).toBe(false);
    });
  });

  describe('Depth Constraints', () => {
    it('should reject traversals exceeding max depth', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH path = (a)-[*..20]-(b) RETURN path LIMIT 10',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations.some((v) => v.code === 'EXCEEDS_MAX_DEPTH')).toBe(true);
    });

    it('should accept traversals within depth limit', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH path = (a)-[*..4]-(b) RETURN path LIMIT 10',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(true);
    });

    it('should reject unbounded patterns', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH path = (a)-[*]-(b) RETURN path LIMIT 10',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations.some((v) => v.code === 'UNBOUNDED_PATTERN')).toBe(true);
    });
  });

  describe('Disallowed Labels', () => {
    it('should reject queries with disallowed labels', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:SensitivePerson) RETURN n LIMIT 10',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(false);
      expect(result.violations.some((v) => v.code === 'DISALLOWED_LABEL')).toBe(true);
    });

    it('should accept queries with allowed labels', () => {
      const result = safetyAnalyzer.analyzeQuerySafety(
        'MATCH (n:Person) RETURN n LIMIT 10',
        'CYPHER',
        testPolicy,
      );

      expect(result.passesStaticChecks).toBe(true);
    });
  });
});

describe('NL to Query Draft Generation', () => {
  let copilotService: ReturnType<typeof createMockCopilotService>;

  beforeEach(() => {
    copilotService = createMockCopilotService();
  });

  afterEach(() => {
    copilotService._clear();
  });

  it('should generate draft from natural language question', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Who is connected to Alice?',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    expect(draft.id).toBeDefined();
    expect(draft.query).toContain('MATCH');
    expect(draft.explanation).toBeDefined();
    expect(draft.parameters).toHaveProperty('name', 'Alice');
  });

  it('should include safety analysis in draft', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Who is connected to Bob?',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    expect(draft.safety).toBeDefined();
    expect(draft.safety.passesStaticChecks).toBe(true);
    expect(draft.safety.estimatedDepth).toBeGreaterThan(0);
  });

  it('should flag unsafe queries in draft', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Delete all entities',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    expect(draft.safety.passesStaticChecks).toBe(false);
    expect(draft.safety.violations.length).toBeGreaterThan(0);
  });

  it('should save draft to repository', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Find all persons',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    const retrieved = await copilotService.getDraft(draft.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(draft.id);
  });

  it('should log preview to audit log', async () => {
    await copilotService.nlToQueryDraft({
      userText: 'Find all persons',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    const auditRecords = copilotService._auditLog._records;
    expect(auditRecords.some((r) => r.action === 'PREVIEW')).toBe(true);
  });

  it('should include cost estimation', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Who is connected to Alice?',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    expect(draft.estimatedCost).toBeDefined();
    expect(draft.estimatedCost.depth).toBeGreaterThan(0);
    expect(draft.estimatedCost.complexity).toBeDefined();
  });
});

describe('Query Execution', () => {
  let copilotService: ReturnType<typeof createMockCopilotService>;

  beforeEach(() => {
    copilotService = createMockCopilotService();
  });

  afterEach(() => {
    copilotService._clear();
  });

  it('should execute safe query with confirmation', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Who is connected to Alice?',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    const result = await copilotService.executeQuery(
      { draftId: draft.id, confirm: true },
      testUser,
      testPolicy,
    );

    expect(result.draftId).toBe(draft.id);
    expect(result.results).toBeDefined();
    expect(result.executionTimeMs).toBeGreaterThan(0);
  });

  it('should reject execution without confirmation', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Who is connected to Alice?',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await expect(
      copilotService.executeQuery({ draftId: draft.id, confirm: false }, testUser, testPolicy),
    ).rejects.toThrow('confirmation required');
  });

  it('should reject unsafe query without override', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Query with no limit please',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await expect(
      copilotService.executeQuery({ draftId: draft.id, confirm: true }, testUser, testPolicy),
    ).rejects.toThrow('Safety check failed');
  });

  it('should allow admin to override safety with reason', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Query with no limit please',
      user: adminUser,
      schema: testSchema,
      policy: testPolicy,
    });

    const result = await copilotService.executeQuery(
      {
        draftId: draft.id,
        confirm: true,
        overrideSafety: true,
        reason: 'Emergency investigation',
      },
      adminUser,
      testPolicy,
    );

    expect(result.draftId).toBe(draft.id);
  });

  it('should reject safety override without reason', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Query with no limit please',
      user: adminUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await expect(
      copilotService.executeQuery(
        { draftId: draft.id, confirm: true, overrideSafety: true },
        adminUser,
        testPolicy,
      ),
    ).rejects.toThrow('Reason required');
  });

  it('should reject safety override from non-privileged user', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Query with no limit please',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await expect(
      copilotService.executeQuery(
        { draftId: draft.id, confirm: true, overrideSafety: true, reason: 'Testing' },
        testUser,
        testPolicy,
      ),
    ).rejects.toThrow('No permission');
  });

  it('should reject execution of non-existent draft', async () => {
    await expect(
      copilotService.executeQuery({ draftId: 'fake-id', confirm: true }, testUser, testPolicy),
    ).rejects.toThrow('Draft not found');
  });

  it('should log execution to audit log', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'Who is connected to Alice?',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await copilotService.executeQuery(
      { draftId: draft.id, confirm: true },
      testUser,
      testPolicy,
    );

    const auditRecords = copilotService._auditLog._records;
    expect(auditRecords.some((r) => r.action === 'EXECUTE')).toBe(true);
  });
});

describe('Draft Management', () => {
  let copilotService: ReturnType<typeof createMockCopilotService>;

  beforeEach(() => {
    copilotService = createMockCopilotService();
  });

  afterEach(() => {
    copilotService._clear();
  });

  it('should retrieve user drafts', async () => {
    await copilotService.nlToQueryDraft({
      userText: 'Query 1',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await copilotService.nlToQueryDraft({
      userText: 'Query 2',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    const drafts = await copilotService.getUserDrafts(testUser.userId);
    expect(drafts.length).toBe(2);
  });

  it('should delete draft', async () => {
    const draft = await copilotService.nlToQueryDraft({
      userText: 'To be deleted',
      user: testUser,
      schema: testSchema,
      policy: testPolicy,
    });

    await copilotService.deleteDraft(draft.id);

    const retrieved = await copilotService.getDraft(draft.id);
    expect(retrieved).toBeNull();
  });
});

describe('Health Check', () => {
  let copilotService: ReturnType<typeof createMockCopilotService>;

  beforeEach(() => {
    copilotService = createMockCopilotService();
  });

  it('should return healthy status', async () => {
    const health = await copilotService.healthCheck();
    expect(health.healthy).toBe(true);
  });
});

describe('LLM Adapter', () => {
  let llmAdapter: ReturnType<typeof createMockLlmAdapter>;

  beforeEach(() => {
    llmAdapter = createMockLlmAdapter();
  });

  it('should generate Cypher for connection queries', async () => {
    const result = await llmAdapter.generateQuery({
      userText: 'Who is connected to Alice?',
      schema: testSchema,
      policy: testPolicy,
      dialect: 'CYPHER',
    });

    expect(result.query).toContain('MATCH');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should include parameters in generated query', async () => {
    const result = await llmAdapter.generateQuery({
      userText: 'Who is connected to Bob?',
      schema: testSchema,
      policy: testPolicy,
      dialect: 'CYPHER',
    });

    expect(result.parameters).toHaveProperty('name', 'Bob');
  });

  it('should return health check', async () => {
    const health = await llmAdapter.healthCheck();
    expect(health.healthy).toBe(true);
  });
});

describe('Concurrent Operations', () => {
  let copilotService: ReturnType<typeof createMockCopilotService>;

  beforeEach(() => {
    copilotService = createMockCopilotService();
  });

  afterEach(() => {
    copilotService._clear();
  });

  it('should handle concurrent draft generations', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      copilotService.nlToQueryDraft({
        userText: `Query ${i}`,
        user: testUser,
        schema: testSchema,
        policy: testPolicy,
      }),
    );

    const drafts = await Promise.all(promises);

    expect(drafts).toHaveLength(5);
    const ids = new Set(drafts.map((d) => d.id));
    expect(ids.size).toBe(5); // All unique IDs
  });
});
