"use strict";
/**
 * Summit Work Graph - Edge Types
 *
 * Edges represent relationships between nodes, enabling:
 * - Causal reasoning (why does this matter?)
 * - Temporal tracking (what happened when?)
 * - Governance (who approved what?)
 * - Attribution (who did this work?)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeValidationRules = exports.WorkGraphEdgeSchema = exports.AllEdgeTypes = exports.MilestoneEdgeTypes = exports.ContainmentEdgeTypes = exports.ProvenanceEdgeTypes = exports.CustomerEdgeTypes = exports.ArtifactEdgeTypes = exports.AssignmentEdgeTypes = exports.GovernanceEdgeTypes = exports.TemporalEdgeTypes = exports.EvidentialEdgeTypes = exports.CausalEdgeTypes = exports.BaseEdgeSchema = void 0;
exports.validateEdge = validateEdge;
exports.getValidEdgeTypes = getValidEdgeTypes;
const zod_1 = require("zod");
// ============================================
// Base Edge Schema
// ============================================
exports.BaseEdgeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string(),
    sourceId: zod_1.z.string().uuid(),
    targetId: zod_1.z.string().uuid(),
    createdAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    weight: zod_1.z.number().min(0).max(1).default(1),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================
// Edge Types by Category
// ============================================
// Causal Edges - Why relationships
exports.CausalEdgeTypes = [
    'drives', // Intent drives Commitment
    'realizes', // Epic realizes Intent
    'implements', // Ticket/PR implements Epic
    'validates', // Test validates Hypothesis
    'supports', // Evidence supports Hypothesis
    'blocks', // Ticket blocks Ticket
    'depends_on', // Ticket depends on Ticket
    'caused_by', // Incident caused by PR/Deployment
    'supersedes', // Ticket supersedes Ticket
];
// Evidential Edges - Trust relationships
exports.EvidentialEdgeTypes = [
    'proves', // Test proves functionality
    'disproves', // Test disproves assumption
    'correlates', // Metric correlates with outcome
    'indicates', // Signal indicates risk
];
// Temporal Edges - Time relationships
exports.TemporalEdgeTypes = [
    'preceded_by', // Event preceded by Event
    'followed_by', // Event followed by Event
    'triggered', // Event triggered Event
    'deployed_to', // PR deployed to Environment
];
// Governance Edges - Approval relationships
exports.GovernanceEdgeTypes = [
    'approved_by', // PR approved by Person
    'reviewed_by', // PR reviewed by Person
    'owned_by', // Node owned by Person
    'governed_by', // Node governed by Policy
    'waived', // Policy waived for Node
];
// Assignment Edges - Work relationships
exports.AssignmentEdgeTypes = [
    'assigned_to', // Ticket assigned to Person/Agent
    'claimed_by', // Contract claimed by Agent
    'completed_by', // Ticket completed by Person/Agent
    'escalated_to', // Ticket escalated to Person
];
// Artifact Edges - Output relationships
exports.ArtifactEdgeTypes = [
    'produced', // Agent produced PR
    'modified', // PR modified File
    'tested_by', // PR tested by Test
    'scanned_by', // PR scanned by Scan
];
// Customer Edges - Business relationships
exports.CustomerEdgeTypes = [
    'requested_by', // Intent requested by Customer
    'committed_to', // Commitment committed to Customer
    'impacts', // Incident impacts Customer
];
// Provenance Edges - Origin tracking
exports.ProvenanceEdgeTypes = [
    'derived_from', // Node derived from external source
    'synced_from', // Node synced from Linear/Jira
    'imported_from', // Node imported from system
];
// Containment Edges - Board/Roadmap relationships
exports.ContainmentEdgeTypes = [
    'contains', // Board/Roadmap contains Ticket/Epic
    'displayed_on', // Ticket displayed on Board
    'scheduled_on', // Epic scheduled on Roadmap
    'part_of', // Ticket part of Sprint
];
// Milestone Edges - Timeline relationships
exports.MilestoneEdgeTypes = [
    'milestone_for', // Milestone marks Roadmap progress
    'targets', // Ticket/Epic targets Milestone
    'achieved_by', // Milestone achieved by completing work
];
// ============================================
// All Edge Types
// ============================================
exports.AllEdgeTypes = [
    ...exports.CausalEdgeTypes,
    ...exports.EvidentialEdgeTypes,
    ...exports.TemporalEdgeTypes,
    ...exports.GovernanceEdgeTypes,
    ...exports.AssignmentEdgeTypes,
    ...exports.ArtifactEdgeTypes,
    ...exports.CustomerEdgeTypes,
    ...exports.ProvenanceEdgeTypes,
    ...exports.ContainmentEdgeTypes,
    ...exports.MilestoneEdgeTypes,
];
// ============================================
// Typed Edge Schemas
// ============================================
exports.WorkGraphEdgeSchema = exports.BaseEdgeSchema.extend({
    type: zod_1.z.enum(exports.AllEdgeTypes),
});
exports.EdgeValidationRules = [
    // Causal
    { edgeType: 'drives', validSourceTypes: ['intent'], validTargetTypes: ['commitment'] },
    { edgeType: 'realizes', validSourceTypes: ['epic'], validTargetTypes: ['intent'] },
    { edgeType: 'implements', validSourceTypes: ['ticket', 'pr'], validTargetTypes: ['epic', 'ticket'] },
    { edgeType: 'validates', validSourceTypes: ['test'], validTargetTypes: ['hypothesis', 'ticket'] },
    { edgeType: 'supports', validSourceTypes: ['*'], validTargetTypes: ['hypothesis'] },
    { edgeType: 'blocks', validSourceTypes: ['ticket'], validTargetTypes: ['ticket'] },
    { edgeType: 'depends_on', validSourceTypes: ['ticket'], validTargetTypes: ['ticket'] },
    { edgeType: 'caused_by', validSourceTypes: ['incident'], validTargetTypes: ['pr', 'environment'] },
    { edgeType: 'supersedes', validSourceTypes: ['ticket'], validTargetTypes: ['ticket'] },
    // Evidential
    { edgeType: 'proves', validSourceTypes: ['test', 'scan'], validTargetTypes: ['pr', 'ticket'] },
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
    { edgeType: 'assigned_to', validSourceTypes: ['ticket'], validTargetTypes: ['agent'], maxOutgoing: 1 },
    { edgeType: 'claimed_by', validSourceTypes: ['ticket'], validTargetTypes: ['agent'], maxOutgoing: 1 },
    { edgeType: 'completed_by', validSourceTypes: ['ticket'], validTargetTypes: ['agent'] },
    { edgeType: 'escalated_to', validSourceTypes: ['ticket', 'incident'], validTargetTypes: ['agent'] },
    // Artifact
    { edgeType: 'produced', validSourceTypes: ['agent', 'ticket'], validTargetTypes: ['pr', 'ticket', 'evidence_bundle'] },
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
function validateEdge(edge, sourceType, targetType) {
    const errors = [];
    const rule = exports.EdgeValidationRules.find((r) => r.edgeType === edge.type);
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
function getValidEdgeTypes(sourceType, targetType) {
    return exports.EdgeValidationRules.filter((rule) => {
        const sourceValid = rule.validSourceTypes.includes('*') || rule.validSourceTypes.includes(sourceType);
        const targetValid = rule.validTargetTypes.includes('*') || rule.validTargetTypes.includes(targetType);
        return sourceValid && targetValid;
    }).map((rule) => rule.edgeType);
}
