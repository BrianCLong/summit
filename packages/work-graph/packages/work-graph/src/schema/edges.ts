/**
 * Summit Work Graph - Edge Types
 */

import { z } from 'zod';

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

export const CausalEdgeTypes = ['drives', 'realizes', 'implements', 'validates', 'supports', 'blocks', 'depends_on', 'caused_by'] as const;
export const EvidentialEdgeTypes = ['proves', 'disproves', 'correlates', 'indicates'] as const;
export const TemporalEdgeTypes = ['preceded_by', 'followed_by', 'triggered', 'deployed_to'] as const;
export const GovernanceEdgeTypes = ['approved_by', 'reviewed_by', 'owned_by', 'governed_by', 'waived'] as const;
export const AssignmentEdgeTypes = ['assigned_to', 'claimed_by', 'completed_by', 'escalated_to'] as const;
export const ArtifactEdgeTypes = ['produced', 'modified', 'tested_by', 'scanned_by'] as const;
export const CustomerEdgeTypes = ['requested_by', 'committed_to', 'impacts'] as const;
export const ProvenanceEdgeTypes = ['derived_from', 'synced_from', 'imported_from'] as const;

export const AllEdgeTypes = [
  ...CausalEdgeTypes, ...EvidentialEdgeTypes, ...TemporalEdgeTypes, ...GovernanceEdgeTypes,
  ...AssignmentEdgeTypes, ...ArtifactEdgeTypes, ...CustomerEdgeTypes, ...ProvenanceEdgeTypes,
] as const;

export type EdgeType = (typeof AllEdgeTypes)[number];

export const WorkGraphEdgeSchema = BaseEdgeSchema.extend({
  type: z.enum(AllEdgeTypes),
});

export type WorkGraphEdge = z.infer<typeof WorkGraphEdgeSchema>;

export interface EdgeValidationRule {
  edgeType: EdgeType;
  validSourceTypes: string[];
  validTargetTypes: string[];
  maxOutgoing?: number;
  maxIncoming?: number;
}

export const EdgeValidationRules: EdgeValidationRule[] = [
  { edgeType: 'drives', validSourceTypes: ['intent'], validTargetTypes: ['commitment'] },
  { edgeType: 'realizes', validSourceTypes: ['epic'], validTargetTypes: ['intent'] },
  { edgeType: 'implements', validSourceTypes: ['ticket', 'pr'], validTargetTypes: ['epic', 'ticket'] },
  { edgeType: 'validates', validSourceTypes: ['test'], validTargetTypes: ['hypothesis'] },
  { edgeType: 'supports', validSourceTypes: ['*'], validTargetTypes: ['hypothesis'] },
  { edgeType: 'blocks', validSourceTypes: ['ticket'], validTargetTypes: ['ticket'] },
  { edgeType: 'depends_on', validSourceTypes: ['ticket'], validTargetTypes: ['ticket'] },
  { edgeType: 'caused_by', validSourceTypes: ['incident'], validTargetTypes: ['pr', 'environment'] },
  { edgeType: 'proves', validSourceTypes: ['test', 'scan'], validTargetTypes: ['pr', 'ticket'] },
  { edgeType: 'deployed_to', validSourceTypes: ['pr'], validTargetTypes: ['environment'] },
  { edgeType: 'assigned_to', validSourceTypes: ['ticket'], validTargetTypes: ['agent'], maxOutgoing: 1 },
  { edgeType: 'claimed_by', validSourceTypes: ['ticket'], validTargetTypes: ['agent'], maxOutgoing: 1 },
  { edgeType: 'completed_by', validSourceTypes: ['ticket'], validTargetTypes: ['agent'] },
  { edgeType: 'produced', validSourceTypes: ['agent'], validTargetTypes: ['pr', 'ticket'] },
  { edgeType: 'requested_by', validSourceTypes: ['intent'], validTargetTypes: ['customer'] },
  { edgeType: 'committed_to', validSourceTypes: ['commitment'], validTargetTypes: ['customer'] },
  { edgeType: 'impacts', validSourceTypes: ['incident'], validTargetTypes: ['customer'] },
  { edgeType: 'synced_from', validSourceTypes: ['ticket', 'epic'], validTargetTypes: ['*'] },
];

export function validateEdge(edge: WorkGraphEdge, sourceType: string, targetType: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const rule = EdgeValidationRules.find(r => r.edgeType === edge.type);
  if (!rule) { errors.push('Unknown edge type: ' + edge.type); return { valid: false, errors }; }
  if (!rule.validSourceTypes.includes('*') && !rule.validSourceTypes.includes(sourceType)) {
    errors.push('Invalid source type ' + sourceType + ' for edge ' + edge.type);
  }
  if (!rule.validTargetTypes.includes('*') && !rule.validTargetTypes.includes(targetType)) {
    errors.push('Invalid target type ' + targetType + ' for edge ' + edge.type);
  }
  return { valid: errors.length === 0, errors };
}

export function getValidEdgeTypes(sourceType: string, targetType: string): EdgeType[] {
  return EdgeValidationRules.filter(rule => {
    const sourceValid = rule.validSourceTypes.includes('*') || rule.validSourceTypes.includes(sourceType);
    const targetValid = rule.validTargetTypes.includes('*') || rule.validTargetTypes.includes(targetType);
    return sourceValid && targetValid;
  }).map(rule => rule.edgeType);
}
