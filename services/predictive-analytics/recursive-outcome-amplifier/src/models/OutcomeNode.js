"use strict";
/**
 * OutcomeNode - Represents a single outcome in a cascade
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeNodeBuilder = void 0;
exports.createRootNode = createRootNode;
exports.applyDampening = applyDampening;
exports.mergeOutcomeNodes = mergeOutcomeNodes;
class OutcomeNodeBuilder {
    node;
    constructor(event, order) {
        this.node = {
            id: this.generateId(),
            event,
            order,
            probability: 1.0,
            magnitude: 1.0,
            timeDelay: 0,
            domain: 'UNKNOWN',
            confidence: 0.5,
            evidenceStrength: 0.5,
            parentNodes: [],
            childNodes: [],
            createdAt: new Date(),
        };
    }
    withProbability(probability) {
        this.node.probability = Math.max(0, Math.min(1, probability));
        return this;
    }
    withMagnitude(magnitude) {
        this.node.magnitude = magnitude;
        return this;
    }
    withTimeDelay(timeDelay) {
        this.node.timeDelay = timeDelay;
        return this;
    }
    withDomain(domain) {
        this.node.domain = domain;
        return this;
    }
    withConfidence(confidence) {
        this.node.confidence = Math.max(0, Math.min(1, confidence));
        return this;
    }
    withEvidenceStrength(evidenceStrength) {
        this.node.evidenceStrength = Math.max(0, Math.min(1, evidenceStrength));
        return this;
    }
    withParents(parentIds) {
        this.node.parentNodes = parentIds;
        return this;
    }
    withChildren(childIds) {
        this.node.childNodes = childIds;
        return this;
    }
    build() {
        return this.node;
    }
    generateId() {
        return `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.OutcomeNodeBuilder = OutcomeNodeBuilder;
function createRootNode(input) {
    return new OutcomeNodeBuilder(input.event, 1)
        .withDomain(input.domain)
        .withMagnitude(input.initialMagnitude || 1.0)
        .withProbability(1.0)
        .withConfidence(0.9)
        .withEvidenceStrength(1.0)
        .build();
}
function applyDampening(node, dampeningFactor) {
    return {
        ...node,
        probability: node.probability * dampeningFactor,
        magnitude: node.magnitude * dampeningFactor,
        confidence: node.confidence * Math.sqrt(dampeningFactor),
    };
}
function mergeOutcomeNodes(nodes) {
    const nodeMap = new Map();
    for (const node of nodes) {
        if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, node);
        }
        else {
            // Merge duplicate nodes (take higher probability)
            const existing = nodeMap.get(node.id);
            if (node.probability > existing.probability) {
                nodeMap.set(node.id, node);
            }
        }
    }
    return Array.from(nodeMap.values());
}
