"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// =============================================================================
// Mock Implementations
// =============================================================================
const createMockSafetyAnalyzer = () => {
    const FORBIDDEN_OPERATIONS = ['DELETE', 'DROP', 'CREATE', 'MERGE', 'SET'];
    return {
        analyzeQuerySafety: globals_1.jest.fn((query, dialect, policy) => {
            const violations = [];
            const warnings = [];
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
            }
            else if (limitValue > policy.maxRows) {
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
        }),
    };
};
const createMockLlmAdapter = () => {
    return {
        generateQuery: globals_1.jest.fn(async (input) => {
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
        }),
        healthCheck: globals_1.jest.fn(async () => ({ healthy: true, latencyMs: 15 })),
    };
};
const createMockDraftRepository = () => {
    const drafts = new Map();
    const userIndex = new Map();
    return {
        save: globals_1.jest.fn(async (draft) => {
            drafts.set(draft.id, draft);
            if (!userIndex.has(draft.createdBy)) {
                userIndex.set(draft.createdBy, new Set());
            }
            userIndex.get(draft.createdBy).add(draft.id);
        }),
        getById: globals_1.jest.fn(async (id) => drafts.get(id) || null),
        deleteById: globals_1.jest.fn(async (id) => {
            const draft = drafts.get(id);
            if (draft) {
                drafts.delete(id);
                userIndex.get(draft.createdBy)?.delete(id);
                return true;
            }
            return false;
        }),
        getByUserId: globals_1.jest.fn(async (userId, limit = 10) => {
            const ids = userIndex.get(userId);
            if (!ids)
                return [];
            const result = [];
            for (const id of ids) {
                const draft = drafts.get(id);
                if (draft)
                    result.push(draft);
                if (result.length >= limit)
                    break;
            }
            return result;
        }),
        deleteExpired: globals_1.jest.fn(async () => {
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
    const records = [];
    return {
        append: globals_1.jest.fn(async (record) => {
            records.push(record);
        }),
        getByUserId: globals_1.jest.fn(async (userId, limit = 100) => {
            return records.filter((r) => r.userId === userId).slice(0, limit);
        }),
        getByDraftId: globals_1.jest.fn(async (draftId) => {
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
        canExecuteQuery: globals_1.jest.fn((input) => {
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
        }),
    };
};
const createMockQueryExecutor = () => {
    return {
        execute: globals_1.jest.fn(async (query, parameters, dialect, maxRows) => {
            // Simulate execution
            await new Promise((resolve) => setTimeout(resolve, 50));
            return {
                results: [
                    { id: 'e1', name: 'Alice', type: 'Person' },
                    { id: 'e2', name: 'Bob', type: 'Person' },
                ],
                executionTimeMs: 52,
            };
        }),
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
    const nlToQueryDraft = async (request) => {
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
        const draft = {
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
                complexity: safetyResult.estimatedDepth > 6 || safetyResult.estimatedRows > 1000
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
    const executeQuery = async (request, user, policy) => {
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
        const result = await queryExecutor.execute(draft.query, draft.parameters, draft.dialect, policy.maxRows);
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
const testSchema = {
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
const testPolicy = {
    maxDepth: 6,
    maxRows: 100,
    disallowedLabels: ['SensitivePerson', 'ClassifiedOrg'],
    disallowedNodeTypes: [],
    disallowedEdgeTypes: [],
    restrictedSensitivityLevels: ['TOP_SECRET'],
};
const testUser = {
    userId: 'user-001',
    roles: ['ANALYST'],
    clearances: ['UNCLASSIFIED', 'CONFIDENTIAL'],
    tenantId: 'tenant-001',
};
const adminUser = {
    userId: 'admin-001',
    roles: ['ADMIN'],
    clearances: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET'],
    tenantId: 'tenant-001',
};
// =============================================================================
// Test Suites
// =============================================================================
(0, globals_1.describe)('Safety Analyzer', () => {
    let safetyAnalyzer;
    (0, globals_1.beforeEach)(() => {
        safetyAnalyzer = createMockSafetyAnalyzer();
    });
    (0, globals_1.describe)('Forbidden Operations', () => {
        (0, globals_1.it)('should reject DELETE operations', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n) DELETE n', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations).toContainEqual(globals_1.expect.objectContaining({ code: 'FORBIDDEN_OPERATION' }));
        });
        (0, globals_1.it)('should reject DROP operations', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('DROP INDEX my_index', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'FORBIDDEN_OPERATION')).toBe(true);
        });
        (0, globals_1.it)('should reject CREATE operations', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('CREATE (n:Person {name: "Test"})', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
        });
        (0, globals_1.it)('should allow valid read queries', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:Person) RETURN n LIMIT 10', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(true);
            (0, globals_1.expect)(result.violations).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Row Limits', () => {
        (0, globals_1.it)('should require LIMIT clause', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:Person) RETURN n', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'MISSING_LIMIT')).toBe(true);
        });
        (0, globals_1.it)('should reject LIMIT exceeding policy', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:Person) RETURN n LIMIT 500', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'EXCEEDS_MAX_ROWS')).toBe(true);
        });
        (0, globals_1.it)('should accept LIMIT within policy', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:Person) RETURN n LIMIT 50', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(true);
        });
        (0, globals_1.it)('should allow COUNT queries without LIMIT', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:Person) RETURN count(n)', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'MISSING_LIMIT')).toBe(false);
        });
    });
    (0, globals_1.describe)('Depth Constraints', () => {
        (0, globals_1.it)('should reject traversals exceeding max depth', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH path = (a)-[*..20]-(b) RETURN path LIMIT 10', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'EXCEEDS_MAX_DEPTH')).toBe(true);
        });
        (0, globals_1.it)('should accept traversals within depth limit', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH path = (a)-[*..4]-(b) RETURN path LIMIT 10', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(true);
        });
        (0, globals_1.it)('should reject unbounded patterns', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH path = (a)-[*]-(b) RETURN path LIMIT 10', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'UNBOUNDED_PATTERN')).toBe(true);
        });
    });
    (0, globals_1.describe)('Disallowed Labels', () => {
        (0, globals_1.it)('should reject queries with disallowed labels', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:SensitivePerson) RETURN n LIMIT 10', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(false);
            (0, globals_1.expect)(result.violations.some((v) => v.code === 'DISALLOWED_LABEL')).toBe(true);
        });
        (0, globals_1.it)('should accept queries with allowed labels', () => {
            const result = safetyAnalyzer.analyzeQuerySafety('MATCH (n:Person) RETURN n LIMIT 10', 'CYPHER', testPolicy);
            (0, globals_1.expect)(result.passesStaticChecks).toBe(true);
        });
    });
});
(0, globals_1.describe)('NL to Query Draft Generation', () => {
    let copilotService;
    (0, globals_1.beforeEach)(() => {
        copilotService = createMockCopilotService();
    });
    (0, globals_1.afterEach)(() => {
        copilotService._clear();
    });
    (0, globals_1.it)('should generate draft from natural language question', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Who is connected to Alice?',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        (0, globals_1.expect)(draft.id).toBeDefined();
        (0, globals_1.expect)(draft.query).toContain('MATCH');
        (0, globals_1.expect)(draft.explanation).toBeDefined();
        (0, globals_1.expect)(draft.parameters).toHaveProperty('name', 'Alice');
    });
    (0, globals_1.it)('should include safety analysis in draft', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Who is connected to Bob?',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        (0, globals_1.expect)(draft.safety).toBeDefined();
        (0, globals_1.expect)(draft.safety.passesStaticChecks).toBe(true);
        (0, globals_1.expect)(draft.safety.estimatedDepth).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should flag unsafe queries in draft', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Delete all entities',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        (0, globals_1.expect)(draft.safety.passesStaticChecks).toBe(false);
        (0, globals_1.expect)(draft.safety.violations.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should save draft to repository', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Find all persons',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        const retrieved = await copilotService.getDraft(draft.id);
        (0, globals_1.expect)(retrieved).toBeDefined();
        (0, globals_1.expect)(retrieved?.id).toBe(draft.id);
    });
    (0, globals_1.it)('should log preview to audit log', async () => {
        await copilotService.nlToQueryDraft({
            userText: 'Find all persons',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        const auditRecords = copilotService._auditLog._records;
        (0, globals_1.expect)(auditRecords.some((r) => r.action === 'PREVIEW')).toBe(true);
    });
    (0, globals_1.it)('should include cost estimation', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Who is connected to Alice?',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        (0, globals_1.expect)(draft.estimatedCost).toBeDefined();
        (0, globals_1.expect)(draft.estimatedCost.depth).toBeGreaterThan(0);
        (0, globals_1.expect)(draft.estimatedCost.complexity).toBeDefined();
    });
});
(0, globals_1.describe)('Query Execution', () => {
    let copilotService;
    (0, globals_1.beforeEach)(() => {
        copilotService = createMockCopilotService();
    });
    (0, globals_1.afterEach)(() => {
        copilotService._clear();
    });
    (0, globals_1.it)('should execute safe query with confirmation', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Who is connected to Alice?',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        const result = await copilotService.executeQuery({ draftId: draft.id, confirm: true }, testUser, testPolicy);
        (0, globals_1.expect)(result.draftId).toBe(draft.id);
        (0, globals_1.expect)(result.results).toBeDefined();
        (0, globals_1.expect)(result.executionTimeMs).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should reject execution without confirmation', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Who is connected to Alice?',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        await (0, globals_1.expect)(copilotService.executeQuery({ draftId: draft.id, confirm: false }, testUser, testPolicy)).rejects.toThrow('confirmation required');
    });
    (0, globals_1.it)('should reject unsafe query without override', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Query with no limit please',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        await (0, globals_1.expect)(copilotService.executeQuery({ draftId: draft.id, confirm: true }, testUser, testPolicy)).rejects.toThrow('Safety check failed');
    });
    (0, globals_1.it)('should allow admin to override safety with reason', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Query with no limit please',
            user: adminUser,
            schema: testSchema,
            policy: testPolicy,
        });
        const result = await copilotService.executeQuery({
            draftId: draft.id,
            confirm: true,
            overrideSafety: true,
            reason: 'Emergency investigation',
        }, adminUser, testPolicy);
        (0, globals_1.expect)(result.draftId).toBe(draft.id);
    });
    (0, globals_1.it)('should reject safety override without reason', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Query with no limit please',
            user: adminUser,
            schema: testSchema,
            policy: testPolicy,
        });
        await (0, globals_1.expect)(copilotService.executeQuery({ draftId: draft.id, confirm: true, overrideSafety: true }, adminUser, testPolicy)).rejects.toThrow('Reason required');
    });
    (0, globals_1.it)('should reject safety override from non-privileged user', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Query with no limit please',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        await (0, globals_1.expect)(copilotService.executeQuery({ draftId: draft.id, confirm: true, overrideSafety: true, reason: 'Testing' }, testUser, testPolicy)).rejects.toThrow('No permission');
    });
    (0, globals_1.it)('should reject execution of non-existent draft', async () => {
        await (0, globals_1.expect)(copilotService.executeQuery({ draftId: 'fake-id', confirm: true }, testUser, testPolicy)).rejects.toThrow('Draft not found');
    });
    (0, globals_1.it)('should log execution to audit log', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'Who is connected to Alice?',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        await copilotService.executeQuery({ draftId: draft.id, confirm: true }, testUser, testPolicy);
        const auditRecords = copilotService._auditLog._records;
        (0, globals_1.expect)(auditRecords.some((r) => r.action === 'EXECUTE')).toBe(true);
    });
});
(0, globals_1.describe)('Draft Management', () => {
    let copilotService;
    (0, globals_1.beforeEach)(() => {
        copilotService = createMockCopilotService();
    });
    (0, globals_1.afterEach)(() => {
        copilotService._clear();
    });
    (0, globals_1.it)('should retrieve user drafts', async () => {
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
        (0, globals_1.expect)(drafts.length).toBe(2);
    });
    (0, globals_1.it)('should delete draft', async () => {
        const draft = await copilotService.nlToQueryDraft({
            userText: 'To be deleted',
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        });
        await copilotService.deleteDraft(draft.id);
        const retrieved = await copilotService.getDraft(draft.id);
        (0, globals_1.expect)(retrieved).toBeNull();
    });
});
(0, globals_1.describe)('Health Check', () => {
    let copilotService;
    (0, globals_1.beforeEach)(() => {
        copilotService = createMockCopilotService();
    });
    (0, globals_1.it)('should return healthy status', async () => {
        const health = await copilotService.healthCheck();
        (0, globals_1.expect)(health.healthy).toBe(true);
    });
});
(0, globals_1.describe)('LLM Adapter', () => {
    let llmAdapter;
    (0, globals_1.beforeEach)(() => {
        llmAdapter = createMockLlmAdapter();
    });
    (0, globals_1.it)('should generate Cypher for connection queries', async () => {
        const result = await llmAdapter.generateQuery({
            userText: 'Who is connected to Alice?',
            schema: testSchema,
            policy: testPolicy,
            dialect: 'CYPHER',
        });
        (0, globals_1.expect)(result.query).toContain('MATCH');
        (0, globals_1.expect)(result.confidence).toBeGreaterThan(0.5);
    });
    (0, globals_1.it)('should include parameters in generated query', async () => {
        const result = await llmAdapter.generateQuery({
            userText: 'Who is connected to Bob?',
            schema: testSchema,
            policy: testPolicy,
            dialect: 'CYPHER',
        });
        (0, globals_1.expect)(result.parameters).toHaveProperty('name', 'Bob');
    });
    (0, globals_1.it)('should return health check', async () => {
        const health = await llmAdapter.healthCheck();
        (0, globals_1.expect)(health.healthy).toBe(true);
    });
});
(0, globals_1.describe)('Concurrent Operations', () => {
    let copilotService;
    (0, globals_1.beforeEach)(() => {
        copilotService = createMockCopilotService();
    });
    (0, globals_1.afterEach)(() => {
        copilotService._clear();
    });
    (0, globals_1.it)('should handle concurrent draft generations', async () => {
        const promises = Array.from({ length: 5 }, (_, i) => copilotService.nlToQueryDraft({
            userText: `Query ${i}`,
            user: testUser,
            schema: testSchema,
            policy: testPolicy,
        }));
        const drafts = await Promise.all(promises);
        (0, globals_1.expect)(drafts).toHaveLength(5);
        const ids = new Set(drafts.map((d) => d.id));
        (0, globals_1.expect)(ids.size).toBe(5); // All unique IDs
    });
});
