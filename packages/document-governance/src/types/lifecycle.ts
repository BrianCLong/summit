/**
 * Document Lifecycle Type Definitions
 */

import { z } from 'zod';
import { LifecycleTypeSchema } from './document.js';

// Lifecycle State Schema
export const LifecycleStateSchema = z.object({
  id: z.string(),
  description: z.string(),
  is_initial: z.boolean().default(false),
  is_terminal: z.boolean().default(false),
});

export type LifecycleState = z.infer<typeof LifecycleStateSchema>;

// Lifecycle Transition Schema
export const LifecycleTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  requires_approval: z.boolean().default(false),
  approvers: z.array(z.string()).optional(),
  notes: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'exists', 'not_exists']),
    value: z.any().optional(),
  })).optional(),
});

export type LifecycleTransition = z.infer<typeof LifecycleTransitionSchema>;

// Lifecycle Definition Schema
export const LifecycleDefinitionSchema = z.object({
  type: LifecycleTypeSchema,
  description: z.string(),
  states: z.array(LifecycleStateSchema),
  default_state: z.string(),
  transitions: z.array(LifecycleTransitionSchema),
});

export type LifecycleDefinition = z.infer<typeof LifecycleDefinitionSchema>;

// Transition Request Schema
export const TransitionRequestSchema = z.object({
  document_id: z.string().uuid(),
  target_state: z.string(),
  comment: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type TransitionRequest = z.infer<typeof TransitionRequestSchema>;

// Transition Result Schema
export const TransitionResultSchema = z.object({
  success: z.boolean(),
  document_id: z.string().uuid(),
  previous_state: z.string(),
  new_state: z.string(),
  transition_id: z.string().uuid().optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  requires_approval: z.boolean(),
  approval_request_id: z.string().uuid().optional(),
});

export type TransitionResult = z.infer<typeof TransitionResultSchema>;

// Approval Request Schema
export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  transition_from: z.string(),
  transition_to: z.string(),
  requested_by: z.string(),
  requested_at: z.string().datetime(),
  approvers: z.array(z.string()),
  status: z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled']),
  comment: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

// Approval Decision Schema
export const ApprovalDecisionSchema = z.object({
  id: z.string().uuid(),
  approval_request_id: z.string().uuid(),
  approver_id: z.string(),
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
  decided_at: z.string().datetime(),
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

// Lifecycle History Entry Schema
export const LifecycleHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  previous_state: z.string().nullable(),
  new_state: z.string(),
  transition_type: z.enum(['manual', 'automatic', 'approval']),
  triggered_by: z.string(),
  triggered_at: z.string().datetime(),
  approval_request_id: z.string().uuid().optional(),
  comment: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type LifecycleHistoryEntry = z.infer<typeof LifecycleHistoryEntrySchema>;

// Available Transitions Response Schema
export const AvailableTransitionsSchema = z.object({
  document_id: z.string().uuid(),
  current_state: z.string(),
  available_transitions: z.array(z.object({
    target_state: z.string(),
    requires_approval: z.boolean(),
    approvers: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })),
});

export type AvailableTransitions = z.infer<typeof AvailableTransitionsSchema>;
