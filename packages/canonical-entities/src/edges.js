"use strict";
/**
 * Edge/Relationship Types for Knowledge Graph
 *
 * Defines canonical edge types with bitemporal and policy/governance fields.
 * All edges track validity periods and can enforce access control policies.
 *
 * @module canonical-entities/edges
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommunicatesWithEdge = isCommunicatesWithEdge;
exports.isFundsEdge = isFundsEdge;
exports.isOwnsEdge = isOwnsEdge;
exports.isControlsEdge = isControlsEdge;
exports.isLocatedAtEdge = isLocatedAtEdge;
exports.isObservedAtEdge = isObservedAtEdge;
exports.isDerivedFromEdge = isDerivedFromEdge;
exports.isSupportsEdge = isSupportsEdge;
exports.isContradictsEdge = isContradictsEdge;
exports.isMentionsEdge = isMentionsEdge;
exports.isAttributedToEdge = isAttributedToEdge;
exports.isPartOfEdge = isPartOfEdge;
exports.isMemberOfEdge = isMemberOfEdge;
exports.isRelatedToEdge = isRelatedToEdge;
// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------
function isCommunicatesWithEdge(edge) {
    return edge.type === 'communicatesWith';
}
function isFundsEdge(edge) {
    return edge.type === 'funds';
}
function isOwnsEdge(edge) {
    return edge.type === 'owns';
}
function isControlsEdge(edge) {
    return edge.type === 'controls';
}
function isLocatedAtEdge(edge) {
    return edge.type === 'locatedAt';
}
function isObservedAtEdge(edge) {
    return edge.type === 'observedAt';
}
function isDerivedFromEdge(edge) {
    return edge.type === 'derivedFrom';
}
function isSupportsEdge(edge) {
    return edge.type === 'supports';
}
function isContradictsEdge(edge) {
    return edge.type === 'contradicts';
}
function isMentionsEdge(edge) {
    return edge.type === 'mentions';
}
function isAttributedToEdge(edge) {
    return edge.type === 'attributedTo';
}
function isPartOfEdge(edge) {
    return edge.type === 'partOf';
}
function isMemberOfEdge(edge) {
    return edge.type === 'memberOf';
}
function isRelatedToEdge(edge) {
    return edge.type === 'relatedTo';
}
