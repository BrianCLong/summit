/**
 * Summit Work Graph - Edge Types
 *
 * Edges represent relationships between nodes, enabling:
 * - Causal reasoning (why does this matter?)
 * - Temporal tracking (what happened when?)
 * - Governance (who approved what?)
 * - Attribution (who did this work?)
 */

import { z } from 'zod';

// ============================================
// Base Edge Schema
// ============================================

export const BaseEdgeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string(),
  weight: z.number().min(0).max(1).default(1),
  metadata: z.record(z.unknown()).optional(),
});

export type BaseEdge = z.infer<typeof BaseEdgeSchema>;

// ============================================
// Edge Types by Category
// ============================================

// Causal Edges - Why relationships
export const CausalEdgeTypes = [
  'drives', // Intent drives Commitment
  'realizes', // Epic realizes Intent
  'implements', // Ticket/PR implements Epic
  'validates', // Test validates Hypothesis
  'supports', // Evidence supports Hypothesis
  'blocks', // Ticket blocks Ticket
  'depends_on', // Ticket depends on Ticket
  'caused_by', // Incident caused by PR/Deployment
  'supersedes', // Task supersedes Task
] as const;

// Evidential Edges - Trust relationships
export const EvidentialEdgeTypes = [
  'proves', // Test proves functionality
  'disproves', // Test disproves assumption
  'correlates', // Metric correlates with outcome
  'indicates', // Signal indicates risk
] as const;

// Temporal Edges - Time relationships
export const TemporalEdgeTypes = [
  'preceded_by', // Event preceded by Event
  'followed_by', // Event followed by Event
  'triggered', // Event triggered Event
  'deployed_to', // PR deployed to Environment
] as const;

// Governance Edges - Approval relationships
export const GovernanceEdgeTypes = [
  'approved_by', // PR approved by Person
  'reviewed_by', // PR reviewed by Person
  'owned_by', // Node owned by Person
  'governed_by', // Node governed by Policy
  'waived', // Policy waived for Node
] as const;

// Assignment Edges - Work relationships
export const AssignmentEdgeTypes = [
  'assigned_to', // Ticket assigned to Person/Agent
  'claimed_by', // Contract claimed by Agent
  'completed_by', // Ticket completed by Person/Agent
  'escalated_to', // Ticket escalated to Person
] as const;

// Artifact Edges - Output relationships
export const ArtifactEdgeTypes = [
  'produced', // Agent produced PR
  'modified', // PR modified File
  'tested_by', // PR tested by Test
  'scanned_by', // PR scanned by Scan
] as const;

// Customer Edges - Business relationships
export const CustomerEdgeTypes = [
  'requested_by', // Intent requested by Customer
  'committed_to', // Commitment committed to Customer
  'impacts', // Incident impacts Customer
] as const;

// Provenance Edges - Origin tracking
export const ProvenanceEdgeTypes = [
  'derived_from', // Node derived from external source
  'synced_from', // Node synced from Linear/Jira
  'imported_from', // Node imported from system
] as const;

// Containment Edges - Board/Roadmap relationships
export const ContainmentEdgeTypes = [
  'contains', // Board/Roadmap contains Ticket/Epic
  'displayed_on', // Ticket displayed on Board
  'scheduled_on', // Epic scheduled on Roadmap
  'part_of', // Ticket part of Sprint
] as const;

// Milestone Edges - Timeline relationships
export const MilestoneEdgeTypes = [
  'milestone_for', // Milestone marks Roadmap progress
  'targets', // Ticket/Epic targets Milestone
  'achieved_by', // Milestone achieved by completing work
] as const;

// ============================================
// All Edge Types
// ============================================

export const AllEdgeTypes = [
  ...CausalEdgeTypes,
  ...EvidentialEdgeTypes,
  ...TemporalEdgeTypes,
  ...GovernanceEdgeTypes,
  ...AssignmentEdgeTypes,
  ...ArtifactEdgeTypes,
  ...CustomerEdgeTypes,
  ...ProvenanceEdgeTypes,
  ...ContainmentEdgeTypes,
  ...MilestoneEdgeTypes,
] as const;

export type EdgeType = (typeof AllEdgeTypes)[number];

// ============================================
// Typed Edge Schemas
// ============================================

export const WorkGraphEdgeSchema = BaseEdgeSchema.extend({
  type: z.enum(AllEdgeTypes),
});

export type WorkGraphEdge = z.infer<typeof WorkGraphEdgeSchema>;

// ============================================
// Edge Validation Rules
// ============================================

export interface EdgeValidationRule {
  edgeType: EdgeType;
  validSourceTypes: string[];
  validTargetTypes: string[];
  maxOutgoing?: number;
  maxIncoming?: number;
  bidirectional?: boolean;
}

export const EdgeValidationRules: EdgeValidationRule[] = [
  // Causal
  { edgeType: 'drives', validSourceTypes: ['intent'], validTargetTypes: ['commitment'] },
  { edgeType: 'realizes', validSourceTypes: ['epic'], validTargetTypes: ['intent'] },
  { edgeType: 'implements', validSourceTypes: ['ticket', 'pr'], validTargetTypes: ['epic', 'ticket'] },
  { edgeType: 'validates', validSourceTypes: ['test'], validTargetTypes: ['hypothesis', 'task'] },
  { edgeType: 'supports', validSourceTypes: ['*'], validTargetTypes: ['hypothesis'] },
  { edgeType: 'blocks', validSourceTypes: ['ticket', 'task'], validTargetTypes: ['ticket', 'task'] },
  { edgeType: 'depends_on', validSourceTypes: ['ticket', 'task'], validTargetTypes: ['ticket', 'task'] },
  { edgeType: 'caused_by', validSourceTypes: ['incident'], validTargetTypes: ['pr', 'environment'] },
  { edgeType: 'supersedes', validSourceTypes: ['task'], validTargetTypes: ['task'] },

  // Evidential
  { edgeType: 'proves', validSourceTypes: ['test', 'scan'], validTargetTypes: ['pr', 'ticket', 'task'] },
  { edgeType: 'disproves', validSourceTypes: ['test'], validTargetTypes: ['hypothesis'] },
  { edgeType: 'correlates', validSourceTypes: ['*'], validTargetTypes: ['*'] },
  { edgeType: 'indicates', validSourceTypes: ['*'], validTargetTypes: ['*'] },

  // Temporal
  { edgeType: 'preceded_by', validSourceTypes: ['*'], validTargetTypes: ['*'] },
  { edgeType: 'followed_by', validSourceTypes: ['*'], validTargetTypes: ['*'] },
  { edgeType: 'triggered', validSourceTypes: ['*'], validTargetTypes: ['*'] },
  { edgeType: 'deployed_to', validSourceTypes: ['pr'], validTargetTypes: ['environment'] },

  // Governance
  { edgeType: 'approved_by', validSourceTypes: ['pr', 'ticket'], validTargetTypes: ['agent'], maxIncoming: 10 },
  { edgeType: 'reviewed_by', validSourceTypes: ['pr'], validTargetTypes: ['agent'] },
  { edgeType: 'owned_by', validSourceTypes: ['*'], validTargetTypes: ['agent', 'customer'], maxOutgoing: 1 },
  { edgeType: 'governed_by', validSourceTypes: ['*'], validTargetTypes: ['policy'] },
  { edgeType: 'waived', validSourceTypes: ['*'], validTargetTypes: ['policy'] },

  // Assignment
  { edgeType: 'assigned_to', validSourceTypes: ['ticket', 'task'], validTargetTypes: ['agent'], maxOutgoing: 1 },
  { edgeType: 'claimed_by', validSourceTypes: ['ticket'], validTargetTypes: ['agent'], maxOutgoing: 1 },
  { edgeType: 'completed_by', validSourceTypes: ['ticket', 'task'], validTargetTypes: ['agent'] },
  { edgeType: 'escalated_to', validSourceTypes: ['ticket', 'incident'], validTargetTypes: ['agent'] },

  // Artifact
  { edgeType: 'produced', validSourceTypes: ['agent', 'task'], validTargetTypes: ['pr', 'ticket', 'artifact'] },
  { edgeType: 'modified', validSourceTypes: ['pr'], validTargetTypes: ['*'] },
  { edgeType: 'tested_by', validSourceTypes: ['pr'], validTargetTypes: ['test'] },
  { edgeType: 'scanned_by', validSourceTypes: ['pr'], validTargetTypes: ['scan'] },

  // Customer
  { edgeType: 'requested_by', validSourceTypes: ['intent'], validTargetTypes: ['customer'] },
  { edgeType: 'committed_to', validSourceTypes: ['commitment'], validTargetTypes: ['customer'] },
  { edgeType: 'impacts', validSourceTypes: ['incident'], validTargetTypes: ['customer'] },

  // Provenance
  { edgeType: 'derived_from', validSourceTypes: ['*'], validTargetTypes: ['*'] },
  { edgeType: 'synced_from', validSourceTypes: ['ticket', 'epic'], validTargetTypes: ['*'] },
  { edgeType: 'imported_from', validSourceTypes: ['*'], validTargetTypes: ['*'] },

  // Containment
  { edgeType: 'contains', validSourceTypes: ['board', 'roadmap', 'sprint'], validTargetTypes: ['ticket', 'epic'] },
  { edgeType: 'displayed_on', validSourceTypes: ['ticket', 'epic'], validTargetTypes: ['board'] },
  { edgeType: 'scheduled_on', validSourceTypes: ['epic', 'ticket'], validTargetTypes: ['roadmap'] },
  { edgeType: 'part_of', validSourceTypes: ['ticket'], validTargetTypes: ['sprint'] },

  // Milestone
  { edgeType: 'milestone_for', validSourceTypes: ['milestone'], validTargetTypes: ['roadmap'] },
  { edgeType: 'targets', validSourceTypes: ['ticket', 'epic'], validTargetTypes: ['milestone'] },
  { edgeType: 'achieved_by', validSourceTypes: ['milestone'], validTargetTypes: ['ticket', 'epic', 'pr'] },
];

// ============================================
// Edge Utilities
// ============================================

export function validateEdge(
  edge: WorkGraphEdge,
  sourceType: string,
  targetType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const rule = EdgeValidationRules.find((r) => r.edgeType === edge.type);

  if (!rule) {
    errors.push(`Unknown edge type: ${edge.type}`);
    return { valid: false, errors };
  }

  if (!rule.validSourceTypes.includes('*') && !rule.validSourceTypes.includes(sourceType)) {
    errors.push(`Invalid source type ${sourceType} for edge ${edge.type}`);
  }

  if (!rule.validTargetTypes.includes('*') && !rule.validTargetTypes.includes(targetType)) {
    errors.push(`Invalid target type ${targetType} for edge ${edge.type}`);
  }

  return { valid: errors.length === 0, errors };
}

export function getValidEdgeTypes(sourceType: string, targetType: string): EdgeType[] {
  return EdgeValidationRules.filter((rule) => {
    const sourceValid = rule.validSourceTypes.includes('*') || rule.validSourceTypes.includes(sourceType);
    const targetValid = rule.validTargetTypes.includes('*') || rule.validTargetTypes.includes(targetType);
    return sourceValid && targetValid;
  }).map((rule) => rule.edgeType);
}
