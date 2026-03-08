"use strict";
/**
 * Summit Work Graph - Edge Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeValidationRules = exports.WorkGraphEdgeSchema = exports.AllEdgeTypes = exports.ProvenanceEdgeTypes = exports.CustomerEdgeTypes = exports.ArtifactEdgeTypes = exports.AssignmentEdgeTypes = exports.GovernanceEdgeTypes = exports.TemporalEdgeTypes = exports.EvidentialEdgeTypes = exports.CausalEdgeTypes = exports.BaseEdgeSchema = void 0;
exports.validateEdge = validateEdge;
exports.getValidEdgeTypes = getValidEdgeTypes;
const zod_1 = require("zod");
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
exports.CausalEdgeTypes = ['drives', 'realizes', 'implements', 'validates', 'supports', 'blocks', 'depends_on', 'caused_by'];
exports.EvidentialEdgeTypes = ['proves', 'disproves', 'correlates', 'indicates'];
exports.TemporalEdgeTypes = ['preceded_by', 'followed_by', 'triggered', 'deployed_to'];
exports.GovernanceEdgeTypes = ['approved_by', 'reviewed_by', 'owned_by', 'governed_by', 'waived'];
exports.AssignmentEdgeTypes = ['assigned_to', 'claimed_by', 'completed_by', 'escalated_to'];
exports.ArtifactEdgeTypes = ['produced', 'modified', 'tested_by', 'scanned_by'];
exports.CustomerEdgeTypes = ['requested_by', 'committed_to', 'impacts'];
exports.ProvenanceEdgeTypes = ['derived_from', 'synced_from', 'imported_from'];
exports.AllEdgeTypes = [
    ...exports.CausalEdgeTypes, ...exports.EvidentialEdgeTypes, ...exports.TemporalEdgeTypes, ...exports.GovernanceEdgeTypes,
    ...exports.AssignmentEdgeTypes, ...exports.ArtifactEdgeTypes, ...exports.CustomerEdgeTypes, ...exports.ProvenanceEdgeTypes,
];
exports.WorkGraphEdgeSchema = exports.BaseEdgeSchema.extend({
    type: zod_1.z.enum(exports.AllEdgeTypes),
});
exports.EdgeValidationRules = [
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
function validateEdge(edge, sourceType, targetType) {
    const errors = [];
    const rule = exports.EdgeValidationRules.find(r => r.edgeType === edge.type);
    if (!rule) {
        errors.push('Unknown edge type: ' + edge.type);
        return { valid: false, errors };
    }
    if (!rule.validSourceTypes.includes('*') && !rule.validSourceTypes.includes(sourceType)) {
        errors.push('Invalid source type ' + sourceType + ' for edge ' + edge.type);
    }
    if (!rule.validTargetTypes.includes('*') && !rule.validTargetTypes.includes(targetType)) {
        errors.push('Invalid target type ' + targetType + ' for edge ' + edge.type);
    }
    return { valid: errors.length === 0, errors };
}
function getValidEdgeTypes(sourceType, targetType) {
    return exports.EdgeValidationRules.filter(rule => {
        const sourceValid = rule.validSourceTypes.includes('*') || rule.validSourceTypes.includes(sourceType);
        const targetValid = rule.validTargetTypes.includes('*') || rule.validTargetTypes.includes(targetType);
        return sourceValid && targetValid;
    }).map(rule => rule.edgeType);
}
