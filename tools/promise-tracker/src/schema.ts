/**
 * Promise Tracking System - Schema Definitions
 *
 * Canonical schema for tracking all promises, commitments, and backlog items
 * across Summit/IntelGraph platform.
 */

import { z } from 'zod';

// =============================================================================
// Core Enums
// =============================================================================

export const ComponentEnum = z.enum([
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

export const ItemTypeEnum = z.enum([
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

export const PriorityEnum = z.enum([
  'P0-critical', // Unblocks core platform or revenue / existential
  'P1-important', // Important this quarter
  'P2-nice-to-have', // Later
  'P3-parking-lot', // Speculative
]);

export const StatusEnum = z.enum([
  'idea', // Just captured, not refined
  'ready', // Refined with acceptance criteria, ready to work
  'in_progress', // Actively being worked on
  'in_review', // Code complete, in PR review
  'in_prod', // Merged and deployed
  'validated', // Confirmed working with real usage/evidence
  'blocked', // Waiting on external dependency
  'wont_do', // Decided not to pursue
]);

export const ScopeClassEnum = z.enum([
  'tiny', // < 2 hours
  'small', // 2-8 hours
  'medium', // 1-3 days
  'large', // 1-2 weeks
  'epic', // > 2 weeks, needs breakdown
]);

export const ConfidenceEnum = z.enum([
  'high', // We're sure we want this
  'medium', // Probably want this
  'low', // Needs validation
]);

// =============================================================================
// Definition of Done Schema
// =============================================================================

export const DefinitionOfDoneSchema = z.object({
  code_merged: z.boolean().default(false),
  tests_exist_and_pass: z.boolean().default(false),
  feature_exposed: z.boolean().default(false), // UI/API/CLI visible
  docs_updated: z.boolean().default(false), // User-facing + runbook
  telemetry_wired: z.boolean().default(false), // Metrics, logs, feature flag
  deployed_to_staging: z.boolean().default(false),
  deployed_to_prod: z.boolean().default(false),
  validated_with_usage: z.boolean().default(false), // Real or simulated usage recorded
});

export type DefinitionOfDone = z.infer<typeof DefinitionOfDoneSchema>;

// =============================================================================
// Evidence Schema
// =============================================================================

export const EvidenceSchema = z.object({
  pr_urls: z.array(z.string().url()).default([]),
  test_run_urls: z.array(z.string().url()).default([]),
  demo_urls: z.array(z.string().url()).default([]),
  screenshots: z.array(z.string()).default([]),
  validation_notes: z.string().optional(),
  validated_by: z.string().optional(),
  validated_at: z.string().datetime().optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

// =============================================================================
// Source Reference Schema
// =============================================================================

export const SourceReferenceSchema = z.object({
  type: z.enum(['doc', 'code', 'chat', 'issue', 'pr', 'spec', 'meeting', 'other']),
  url: z.string().optional(),
  file_path: z.string().optional(),
  line_number: z.number().optional(),
  snippet: z.string().optional(),
  captured_at: z.string().datetime().default(() => new Date().toISOString()),
});

export type SourceReference = z.infer<typeof SourceReferenceSchema>;

// =============================================================================
// Acceptance Criteria Schema
// =============================================================================

export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  met: z.boolean().default(false),
  evidence: z.string().optional(),
});

export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

// =============================================================================
// Backlog Item Schema
// =============================================================================

export const BacklogItemSchema = z.object({
  // Identity
  id: z.string(), // Local ID: BL-001, PT-001, etc.
  github_issue_id: z.number().optional(),
  github_issue_url: z.string().url().optional(),
  epic_id: z.string().optional(),

  // Core fields
  title: z.string().min(5).max(200),
  description: z.string().optional(),
  component: ComponentEnum,
  type: ItemTypeEnum,
  priority: PriorityEnum.default('P2-nice-to-have'),
  status: StatusEnum.default('idea'),
  scope_class: ScopeClassEnum.default('medium'),
  confidence: ConfidenceEnum.default('medium'),

  // Acceptance & Completion
  acceptance_criteria: z.array(AcceptanceCriterionSchema).default([]),
  definition_of_done: DefinitionOfDoneSchema.default({}),
  evidence: EvidenceSchema.default({}),

  // Metadata
  owner: z.string().optional(),
  labels: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]), // IDs of blocking items
  blocked_by: z.array(z.string()).default([]),
  spec_url: z.string().url().optional(),

  // Source tracking
  sources: z.array(SourceReferenceSchema).default([]),

  // Timestamps
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString()),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  validated_at: z.string().datetime().optional(),
});

export type BacklogItem = z.infer<typeof BacklogItemSchema>;

// =============================================================================
// Epic Schema
// =============================================================================

export const EpicSchema = z.object({
  id: z.string(),
  github_issue_id: z.number().optional(),
  github_issue_url: z.string().url().optional(),

  title: z.string(),
  goal: z.string(),
  narrative: z.string().optional(), // Why now? Who benefits?
  in_scope: z.array(z.string()).default([]),
  out_of_scope: z.array(z.string()).default([]),

  component: ComponentEnum,
  priority: PriorityEnum,
  status: StatusEnum.default('idea'),

  // Success measures
  success_measures: z.array(z.string()).default([]), // KPIs/SLIs

  // Links
  prd_url: z.string().url().optional(),
  tech_spec_url: z.string().url().optional(),
  design_url: z.string().url().optional(),

  // Children
  child_items: z.array(z.string()).default([]), // Backlog item IDs

  // Metadata
  owner: z.string().optional(),
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString()),
  target_date: z.string().optional(),
});

export type Epic = z.infer<typeof EpicSchema>;

// =============================================================================
// Staging Item Schema (for initial capture)
// =============================================================================

export const StagingItemSchema = z.object({
  raw_source: z.string(), // Where we found it
  rough_title: z.string(),
  notes: z.string(), // Full text snippet
  confidence: ConfidenceEnum,
  scope_class: ScopeClassEnum,
  component: ComponentEnum.optional(),
  suggested_type: ItemTypeEnum.optional(),
  captured_at: z.string().datetime().default(() => new Date().toISOString()),
  processed: z.boolean().default(false),
  backlog_item_id: z.string().optional(), // Once converted
});

export type StagingItem = z.infer<typeof StagingItemSchema>;

// =============================================================================
// Backlog Database Schema
// =============================================================================

export const BacklogDatabaseSchema = z.object({
  version: z.string().default('1.0.0'),
  last_updated: z.string().datetime().default(() => new Date().toISOString()),
  epics: z.array(EpicSchema).default([]),
  items: z.array(BacklogItemSchema).default([]),
  staging: z.array(StagingItemSchema).default([]),
});

export type BacklogDatabase = z.infer<typeof BacklogDatabaseSchema>;

// =============================================================================
// Health Metrics Schema
// =============================================================================

export const BacklogHealthSchema = z.object({
  total_items: z.number(),
  by_status: z.record(StatusEnum, z.number()),
  by_component: z.record(ComponentEnum, z.number()),
  by_priority: z.record(PriorityEnum, z.number()),
  doc_only_count: z.number(), // Captured but not implemented
  stale_in_progress: z.number(), // In progress > 14 days
  missing_acceptance_criteria: z.number(),
  missing_definition_of_done: z.number(),
  validated_rate: z.number(), // % of "in_prod" that are "validated"
  avg_days_ready_to_validated: z.number().optional(),
  generated_at: z.string().datetime(),
});

export type BacklogHealth = z.infer<typeof BacklogHealthSchema>;

// =============================================================================
// Export all schemas for runtime validation
// =============================================================================

export const schemas = {
  BacklogItem: BacklogItemSchema,
  Epic: EpicSchema,
  StagingItem: StagingItemSchema,
  BacklogDatabase: BacklogDatabaseSchema,
  BacklogHealth: BacklogHealthSchema,
  DefinitionOfDone: DefinitionOfDoneSchema,
  Evidence: EvidenceSchema,
  SourceReference: SourceReferenceSchema,
  AcceptanceCriterion: AcceptanceCriterionSchema,
};

export default schemas;
