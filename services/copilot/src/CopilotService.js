"use strict";
/**
 * Copilot Service - Core NL to Query Orchestration
 *
 * This service coordinates:
 * 1. LLM-based query generation from natural language
 * 2. Static safety analysis of generated queries
 * 3. Draft query management (preview → confirm → execute)
 * 4. Audit logging of all operations
 * 5. Policy engine integration for execution decisions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockQueryExecutor = exports.StubPolicyEngine = exports.CopilotService = void 0;
const uuid_1 = require("uuid");
const DEFAULT_CONFIG = {
    defaultDialect: 'CYPHER',
    draftExpirationMs: 30 * 60 * 1000, // 30 minutes
    maxDraftsPerUser: 10,
    requireConfirmation: true,
    allowSafetyOverride: true,
    privilegedRoles: ['ADMIN', 'SUPERVISOR', 'LEAD'],
};
// =============================================================================
// Copilot Service Implementation
// =============================================================================
class CopilotService {
    llmAdapter;
    safetyAnalyzer;
    draftRepository;
    auditLog;
    policyEngine;
    queryExecutor;
    config;
    constructor(llmAdapter, safetyAnalyzer, draftRepository, auditLog, policyEngine, queryExecutor, config) {
        this.llmAdapter = llmAdapter;
        this.safetyAnalyzer = safetyAnalyzer;
        this.draftRepository = draftRepository;
        this.auditLog = auditLog;
        this.policyEngine = policyEngine;
        this.queryExecutor = queryExecutor;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    // ---------------------------------------------------------------------------
    // Preview: NL → Draft Query
    // ---------------------------------------------------------------------------
    /**
     * Generate a draft query from natural language input.
     * This is the main entry point for the copilot preview flow.
     *
     * The draft is NOT executed - it requires explicit confirmation via execute().
     */
    async nlToQueryDraft(request) {
        const startTime = Date.now();
        const { userText, user, schema, policy } = request;
        const dialect = request.dialect || this.config.defaultDialect;
        // 1. Generate query via LLM
        const llmOutput = await this.llmAdapter.generateQuery({
            userText,
            schema,
            policy,
            dialect,
        });
        // 2. Analyze safety of generated query
        const safetyResult = this.safetyAnalyzer.analyzeQuerySafety(llmOutput.query, dialect, policy);
        // 3. Estimate query cost
        const costEstimate = this.estimateQueryCost(llmOutput.query, dialect, safetyResult);
        // 4. Create draft
        const now = new Date();
        const draft = {
            id: (0, uuid_1.v4)(),
            userText,
            query: llmOutput.query,
            dialect,
            explanation: llmOutput.explanation,
            assumptions: llmOutput.assumptions,
            parameters: llmOutput.parameters,
            estimatedCost: costEstimate,
            safety: safetyResult,
            createdAt: now.toISOString(),
            createdBy: user.userId,
            expiresAt: new Date(now.getTime() + this.config.draftExpirationMs).toISOString(),
            investigationId: request.investigationId,
            conversationId: request.conversationId,
        };
        // 5. Save draft
        await this.draftRepository.save(draft);
        // 6. Audit log the preview
        await this.logAuditEvent({
            id: (0, uuid_1.v4)(),
            timestamp: now.toISOString(),
            userId: user.userId,
            tenantId: user.tenantId,
            action: 'PREVIEW',
            draftId: draft.id,
            userText,
            query: llmOutput.query,
            dialect,
            safetySummary: {
                passesStaticChecks: safetyResult.passesStaticChecks,
                violations: safetyResult.violations.map((v) => v.message),
                estimatedDepth: safetyResult.estimatedDepth,
                estimatedRows: safetyResult.estimatedRows,
            },
            metadata: {
                llmConfidence: llmOutput.confidence,
                processingTimeMs: Date.now() - startTime,
            },
        });
        return draft;
    }
    // ---------------------------------------------------------------------------
    // Execute: Run Confirmed Query
    // ---------------------------------------------------------------------------
    /**
     * Execute a previously generated draft query.
     *
     * Requirements:
     * - Must have explicit confirmation (confirm = true)
     * - Must pass safety checks OR have safety override with proper privileges
     * - Must pass policy engine evaluation
     */
    async executeQuery(request, user, policy) {
        const startTime = Date.now();
        const { draftId, confirm, overrideSafety, reason } = request;
        // 1. Load draft
        const draft = await this.draftRepository.getById(draftId);
        if (!draft) {
            await this.logExecutionDenied(draftId, user, 'DRAFT_NOT_FOUND', 'Draft query not found');
            throw new Error(`Draft query not found: ${draftId}`);
        }
        // 2. Check if draft has expired
        if (draft.expiresAt && new Date(draft.expiresAt) < new Date()) {
            await this.logExecutionDenied(draftId, user, 'DRAFT_EXPIRED', 'Draft query has expired');
            throw new Error('Draft query has expired. Please generate a new preview.');
        }
        // 3. Require explicit confirmation
        if (!confirm) {
            await this.logExecutionDenied(draftId, user, 'NO_CONFIRMATION', 'Explicit confirmation required');
            throw new Error('Explicit confirmation (confirm: true) is required to execute queries');
        }
        // 4. Check safety
        if (!draft.safety.passesStaticChecks) {
            if (!overrideSafety) {
                await this.logExecutionDenied(draftId, user, 'SAFETY_CHECK_FAILED', `Query failed safety checks: ${draft.safety.violations.map((v) => v.message).join('; ')}`);
                throw new Error(`Query failed safety checks: ${draft.safety.violations.map((v) => v.message).join('; ')}`);
            }
            // 5. If safety override requested, check privileges
            if (!this.canOverrideSafety(user)) {
                await this.logExecutionDenied(draftId, user, 'OVERRIDE_NOT_ALLOWED', 'User does not have permission to override safety checks');
                throw new Error('You do not have permission to override safety checks');
            }
            // 6. Require reason for safety override
            if (!reason) {
                await this.logExecutionDenied(draftId, user, 'OVERRIDE_REASON_REQUIRED', 'Reason required for safety override');
                throw new Error('A reason is required when overriding safety checks');
            }
            // Log safety override
            await this.logAuditEvent({
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                userId: user.userId,
                tenantId: user.tenantId,
                action: 'SAFETY_OVERRIDE',
                draftId,
                query: draft.query,
                dialect: draft.dialect,
                decision: {
                    confirmed: true,
                    overrideSafety: true,
                    reason,
                },
                metadata: {
                    violations: draft.safety.violations.map((v) => v.message),
                },
            });
        }
        // 7. Policy engine check
        const policyDecision = this.policyEngine.canExecuteQuery({
            user,
            draft,
            operationType: 'EXECUTE',
            overrideSafety,
        });
        if (!policyDecision.allow) {
            await this.logExecutionDenied(draftId, user, 'POLICY_DENIED', policyDecision.reason);
            throw new Error(`Policy denied execution: ${policyDecision.reason}`);
        }
        // 8. Execute the query with server-side safety limits
        const maxRows = Math.min(policy.maxRows, draft.estimatedCost.expectedRows || policy.maxRows);
        try {
            const executionResult = await this.queryExecutor.execute(draft.query, draft.parameters, draft.dialect, maxRows);
            const response = {
                draftId,
                results: executionResult.results,
                truncated: executionResult.results.length >= maxRows,
                executedAt: new Date().toISOString(),
                executionTimeMs: executionResult.executionTimeMs,
                rowCount: executionResult.results.length,
            };
            // Log successful execution
            await this.logAuditEvent({
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                userId: user.userId,
                tenantId: user.tenantId,
                action: 'EXECUTE',
                draftId,
                userText: draft.userText,
                query: draft.query,
                dialect: draft.dialect,
                safetySummary: {
                    passesStaticChecks: draft.safety.passesStaticChecks,
                    violations: draft.safety.violations.map((v) => v.message),
                    estimatedDepth: draft.safety.estimatedDepth,
                    estimatedRows: draft.safety.estimatedRows,
                },
                decision: {
                    confirmed: true,
                    overrideSafety: overrideSafety || false,
                    reason,
                },
                result: {
                    success: true,
                    rowCount: response.rowCount,
                    executionTimeMs: response.executionTimeMs,
                },
                metadata: {
                    totalProcessingTimeMs: Date.now() - startTime,
                    truncated: response.truncated,
                },
            });
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.logAuditEvent({
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                userId: user.userId,
                tenantId: user.tenantId,
                action: 'EXECUTE',
                draftId,
                query: draft.query,
                dialect: draft.dialect,
                result: {
                    success: false,
                    error: errorMessage,
                },
            });
            throw new Error(`Query execution failed: ${errorMessage}`);
        }
    }
    // ---------------------------------------------------------------------------
    // Helper Methods
    // ---------------------------------------------------------------------------
    estimateQueryCost(query, dialect, safetyResult) {
        const depth = safetyResult.estimatedDepth;
        const rows = safetyResult.estimatedRows;
        // Estimate complexity based on depth and expected rows
        let complexity;
        if (depth <= 2 && rows <= 50) {
            complexity = 'LOW';
        }
        else if (depth <= 4 && rows <= 200) {
            complexity = 'MEDIUM';
        }
        else if (depth <= 6 && rows <= 1000) {
            complexity = 'HIGH';
        }
        else {
            complexity = 'EXTREME';
        }
        // Rough execution time estimate (very approximate)
        const estimatedExecutionTimeMs = Math.min(30000, // Cap at 30 seconds
        depth * 50 + rows * 2);
        return {
            depth,
            expectedRows: rows,
            complexity,
            estimatedExecutionTimeMs,
        };
    }
    canOverrideSafety(user) {
        if (!this.config.allowSafetyOverride) {
            return false;
        }
        return user.roles.some((role) => this.config.privilegedRoles.includes(role));
    }
    async logAuditEvent(record) {
        try {
            await this.auditLog.append(record);
        }
        catch (error) {
            // Don't let audit failures break the main flow, but log the error
            console.error('Failed to write audit log:', error);
        }
    }
    async logExecutionDenied(draftId, user, code, reason) {
        await this.logAuditEvent({
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            userId: user.userId,
            tenantId: user.tenantId,
            action: 'EXECUTE_DENIED',
            draftId,
            result: {
                success: false,
                error: `${code}: ${reason}`,
            },
            metadata: {
                denialCode: code,
                denialReason: reason,
            },
        });
    }
    // ---------------------------------------------------------------------------
    // Draft Management
    // ---------------------------------------------------------------------------
    /**
     * Get a draft by ID.
     */
    async getDraft(draftId) {
        return this.draftRepository.getById(draftId);
    }
    /**
     * Get all drafts for a user.
     */
    async getUserDrafts(userId, limit = 10) {
        return this.draftRepository.getByUserId(userId, limit);
    }
    /**
     * Delete a draft.
     */
    async deleteDraft(draftId) {
        return this.draftRepository.deleteById(draftId);
    }
    /**
     * Clean up expired drafts.
     */
    async cleanupExpiredDrafts() {
        return this.draftRepository.deleteExpired();
    }
    // ---------------------------------------------------------------------------
    // Health Check
    // ---------------------------------------------------------------------------
    async healthCheck() {
        const llmHealth = await this.llmAdapter.healthCheck();
        return {
            healthy: llmHealth.healthy,
            details: {
                llm: llmHealth,
                config: {
                    defaultDialect: this.config.defaultDialect,
                    draftExpirationMs: this.config.draftExpirationMs,
                },
            },
        };
    }
}
exports.CopilotService = CopilotService;
// =============================================================================
// Stub Implementations for Dependencies
// =============================================================================
/**
 * Simple stub policy engine that checks basic rules.
 */
class StubPolicyEngine {
    canExecuteQuery(input) {
        const { user, draft } = input;
        // Rule 1: Check clearance for sensitive queries
        const hasSensitiveViolation = draft.safety.violations.some((v) => v.code === 'SENSITIVE_DATA_ACCESS');
        if (hasSensitiveViolation) {
            const hasHighClearance = user.clearances.some((c) => ['SECRET', 'TOP_SECRET'].includes(c));
            if (!hasHighClearance) {
                return {
                    allow: false,
                    reason: 'Insufficient clearance for sensitive data access',
                };
            }
        }
        // Rule 2: Block extreme complexity queries
        if (draft.estimatedCost.complexity === 'EXTREME' && !input.overrideSafety) {
            return {
                allow: false,
                reason: 'Query complexity is too high. Consider narrowing the scope.',
            };
        }
        return {
            allow: true,
            reason: 'Policy checks passed',
        };
    }
}
exports.StubPolicyEngine = StubPolicyEngine;
/**
 * Mock query executor for testing.
 */
class MockQueryExecutor {
    async execute(query, parameters, dialect, maxRows) {
        // Simulate execution delay
        const startTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
        // Return mock results
        const results = [];
        const rowCount = Math.min(5, maxRows);
        for (let i = 0; i < rowCount; i++) {
            results.push({
                id: `entity-${i + 1}`,
                name: `Mock Entity ${i + 1}`,
                type: 'PERSON',
                properties: { source: 'mock' },
            });
        }
        return {
            results,
            executionTimeMs: Date.now() - startTime,
        };
    }
}
exports.MockQueryExecutor = MockQueryExecutor;
