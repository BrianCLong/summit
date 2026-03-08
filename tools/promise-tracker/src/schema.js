"use strict";
/**
 * Promise Tracking System - Schema Definitions
 *
 * Canonical schema for tracking all promises, commitments, and backlog items
 * across Summit/IntelGraph platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.BacklogHealthSchema = exports.BacklogDatabaseSchema = exports.StagingItemSchema = exports.EpicSchema = exports.BacklogItemSchema = exports.AcceptanceCriterionSchema = exports.SourceReferenceSchema = exports.EvidenceSchema = exports.DefinitionOfDoneSchema = exports.ConfidenceEnum = exports.ScopeClassEnum = exports.StatusEnum = exports.PriorityEnum = exports.ItemTypeEnum = exports.ComponentEnum = void 0;
const zod_1 = require("zod");
// =============================================================================
// Core Enums
// =============================================================================
exports.ComponentEnum = zod_1.z.enum([
    'Summit',
    'CompanyOS',
    'Maestro',
    'Switchboard',
    'IntelGraph',
    'Conductor',
    'GraphAPI',
    'Analytics',
    'Copilot',
    'Auth',
    'CI/CD',
    'Observability',
    'Infrastructure',
    'Documentation',
    'Testing',
    'Security',
    'Data',
    'UI/UX',
    'Other',
]);
exports.ItemTypeEnum = zod_1.z.enum([
    'feature',
    'tech_debt',
    'spike',
    'doc',
    'ops',
    'bug',
    'security',
    'performance',
    'refactor',
    'integration',
]);
exports.PriorityEnum = zod_1.z.enum([
    'P0-critical', // Unblocks core platform or revenue / existential
    'P1-important', // Important this quarter
    'P2-nice-to-have', // Later
    'P3-parking-lot', // Speculative
]);
exports.StatusEnum = zod_1.z.enum([
    'idea', // Just captured, not refined
    'ready', // Refined with acceptance criteria, ready to work
    'in_progress', // Actively being worked on
    'in_review', // Code complete, in PR review
    'in_prod', // Merged and deployed
    'validated', // Confirmed working with real usage/evidence
    'blocked', // Waiting on external dependency
    'wont_do', // Decided not to pursue
]);
exports.ScopeClassEnum = zod_1.z.enum([
    'tiny', // < 2 hours
    'small', // 2-8 hours
    'medium', // 1-3 days
    'large', // 1-2 weeks
    'epic', // > 2 weeks, needs breakdown
]);
exports.ConfidenceEnum = zod_1.z.enum([
    'high', // We're sure we want this
    'medium', // Probably want this
    'low', // Needs validation
]);
// =============================================================================
// Definition of Done Schema
// =============================================================================
exports.DefinitionOfDoneSchema = zod_1.z.object({
    code_merged: zod_1.z.boolean().default(false),
    tests_exist_and_pass: zod_1.z.boolean().default(false),
    feature_exposed: zod_1.z.boolean().default(false), // UI/API/CLI visible
    docs_updated: zod_1.z.boolean().default(false), // User-facing + runbook
    telemetry_wired: zod_1.z.boolean().default(false), // Metrics, logs, feature flag
    deployed_to_staging: zod_1.z.boolean().default(false),
    deployed_to_prod: zod_1.z.boolean().default(false),
    validated_with_usage: zod_1.z.boolean().default(false), // Real or simulated usage recorded
});
// =============================================================================
// Evidence Schema
// =============================================================================
exports.EvidenceSchema = zod_1.z.object({
    pr_urls: zod_1.z.array(zod_1.z.string().url()).default([]),
    test_run_urls: zod_1.z.array(zod_1.z.string().url()).default([]),
    demo_urls: zod_1.z.array(zod_1.z.string().url()).default([]),
    screenshots: zod_1.z.array(zod_1.z.string()).default([]),
    validation_notes: zod_1.z.string().optional(),
    validated_by: zod_1.z.string().optional(),
    validated_at: zod_1.z.string().datetime().optional(),
});
// =============================================================================
// Source Reference Schema
// =============================================================================
exports.SourceReferenceSchema = zod_1.z.object({
    type: zod_1.z.enum(['doc', 'code', 'chat', 'issue', 'pr', 'spec', 'meeting', 'other']),
    url: zod_1.z.string().optional(),
    file_path: zod_1.z.string().optional(),
    line_number: zod_1.z.number().optional(),
    snippet: zod_1.z.string().optional(),
    captured_at: zod_1.z.string().datetime().default(() => new Date().toISOString()),
});
// =============================================================================
// Acceptance Criteria Schema
// =============================================================================
exports.AcceptanceCriterionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string(),
    met: zod_1.z.boolean().default(false),
    evidence: zod_1.z.string().optional(),
});
// =============================================================================
// Backlog Item Schema
// =============================================================================
exports.BacklogItemSchema = zod_1.z.object({
    // Identity
    id: zod_1.z.string(), // Local ID: BL-001, PT-001, etc.
    github_issue_id: zod_1.z.number().optional(),
    github_issue_url: zod_1.z.string().url().optional(),
    epic_id: zod_1.z.string().optional(),
    // Core fields
    title: zod_1.z.string().min(5).max(200),
    description: zod_1.z.string().optional(),
    component: exports.ComponentEnum,
    type: exports.ItemTypeEnum,
    priority: exports.PriorityEnum.default('P2-nice-to-have'),
    status: exports.StatusEnum.default('idea'),
    scope_class: exports.ScopeClassEnum.default('medium'),
    confidence: exports.ConfidenceEnum.default('medium'),
    // Acceptance & Completion
    acceptance_criteria: zod_1.z.array(exports.AcceptanceCriterionSchema).default([]),
    definition_of_done: exports.DefinitionOfDoneSchema.default({}),
    evidence: exports.EvidenceSchema.default({}),
    // Metadata
    owner: zod_1.z.string().optional(),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]), // IDs of blocking items
    blocked_by: zod_1.z.array(zod_1.z.string()).default([]),
    spec_url: zod_1.z.string().url().optional(),
    // Source tracking
    sources: zod_1.z.array(exports.SourceReferenceSchema).default([]),
    // Timestamps
    created_at: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    updated_at: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    started_at: zod_1.z.string().datetime().optional(),
    completed_at: zod_1.z.string().datetime().optional(),
    validated_at: zod_1.z.string().datetime().optional(),
});
// =============================================================================
// Epic Schema
// =============================================================================
exports.EpicSchema = zod_1.z.object({
    id: zod_1.z.string(),
    github_issue_id: zod_1.z.number().optional(),
    github_issue_url: zod_1.z.string().url().optional(),
    title: zod_1.z.string(),
    goal: zod_1.z.string(),
    narrative: zod_1.z.string().optional(), // Why now? Who benefits?
    in_scope: zod_1.z.array(zod_1.z.string()).default([]),
    out_of_scope: zod_1.z.array(zod_1.z.string()).default([]),
    component: exports.ComponentEnum,
    priority: exports.PriorityEnum,
    status: exports.StatusEnum.default('idea'),
    // Success measures
    success_measures: zod_1.z.array(zod_1.z.string()).default([]), // KPIs/SLIs
    // Links
    prd_url: zod_1.z.string().url().optional(),
    tech_spec_url: zod_1.z.string().url().optional(),
    design_url: zod_1.z.string().url().optional(),
    // Children
    child_items: zod_1.z.array(zod_1.z.string()).default([]), // Backlog item IDs
    // Metadata
    owner: zod_1.z.string().optional(),
    created_at: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    updated_at: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    target_date: zod_1.z.string().optional(),
});
// =============================================================================
// Staging Item Schema (for initial capture)
// =============================================================================
exports.StagingItemSchema = zod_1.z.object({
    raw_source: zod_1.z.string(), // Where we found it
    rough_title: zod_1.z.string(),
    notes: zod_1.z.string(), // Full text snippet
    confidence: exports.ConfidenceEnum,
    scope_class: exports.ScopeClassEnum,
    component: exports.ComponentEnum.optional(),
    suggested_type: exports.ItemTypeEnum.optional(),
    captured_at: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    processed: zod_1.z.boolean().default(false),
    backlog_item_id: zod_1.z.string().optional(), // Once converted
});
// =============================================================================
// Backlog Database Schema
// =============================================================================
exports.BacklogDatabaseSchema = zod_1.z.object({
    version: zod_1.z.string().default('1.0.0'),
    last_updated: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    epics: zod_1.z.array(exports.EpicSchema).default([]),
    items: zod_1.z.array(exports.BacklogItemSchema).default([]),
    staging: zod_1.z.array(exports.StagingItemSchema).default([]),
});
// =============================================================================
// Health Metrics Schema
// =============================================================================
exports.BacklogHealthSchema = zod_1.z.object({
    total_items: zod_1.z.number(),
    by_status: zod_1.z.record(exports.StatusEnum, zod_1.z.number()),
    by_component: zod_1.z.record(exports.ComponentEnum, zod_1.z.number()),
    by_priority: zod_1.z.record(exports.PriorityEnum, zod_1.z.number()),
    doc_only_count: zod_1.z.number(), // Captured but not implemented
    stale_in_progress: zod_1.z.number(), // In progress > 14 days
    missing_acceptance_criteria: zod_1.z.number(),
    missing_definition_of_done: zod_1.z.number(),
    validated_rate: zod_1.z.number(), // % of "in_prod" that are "validated"
    avg_days_ready_to_validated: zod_1.z.number().optional(),
    generated_at: zod_1.z.string().datetime(),
});
// =============================================================================
// Export all schemas for runtime validation
// =============================================================================
exports.schemas = {
    BacklogItem: exports.BacklogItemSchema,
    Epic: exports.EpicSchema,
    StagingItem: exports.StagingItemSchema,
    BacklogDatabase: exports.BacklogDatabaseSchema,
    BacklogHealth: exports.BacklogHealthSchema,
    DefinitionOfDone: exports.DefinitionOfDoneSchema,
    Evidence: exports.EvidenceSchema,
    SourceReference: exports.SourceReferenceSchema,
    AcceptanceCriterion: exports.AcceptanceCriterionSchema,
};
exports.default = exports.schemas;
