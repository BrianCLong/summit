"use strict";
/**
 * Runbook Runtime Types
 *
 * Enhanced types for DAG-based runbook execution with:
 * - PAUSE/RESUME/CANCEL control actions
 * - Persistent execution state
 * - Pluggable step executors
 * - Comprehensive audit logging
 *
 * @module runbooks/runtime/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExecutionId = generateExecutionId;
exports.generateLogId = generateLogId;
exports.nowISO = nowISO;
exports.createInitialExecution = createInitialExecution;
const uuid_1 = require("uuid");
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Generate a new execution ID
 */
function generateExecutionId() {
    return `exec-${(0, uuid_1.v4)()}`;
}
/**
 * Generate a new log entry ID
 */
function generateLogId() {
    return `log-${(0, uuid_1.v4)()}`;
}
/**
 * Get current ISO timestamp
 */
function nowISO() {
    return new Date().toISOString();
}
/**
 * Create initial execution state
 */
function createInitialExecution(runbook, input, options) {
    const now = nowISO();
    return {
        executionId: generateExecutionId(),
        runbookId: runbook.id,
        runbookVersion: runbook.version,
        startedBy: options.startedBy,
        tenantId: options.tenantId,
        startedAt: now,
        lastUpdatedAt: now,
        status: 'PENDING',
        input,
        steps: runbook.steps.map((step) => ({
            stepId: step.id,
            status: 'PENDING',
            attempt: 0,
        })),
        authorityIds: options.authorityIds,
        legalBasis: options.legalBasis,
        dataLicenses: options.dataLicenses,
        evidence: [],
        citations: [],
        proofs: [],
        kpis: {},
    };
}
