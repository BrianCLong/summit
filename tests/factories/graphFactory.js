"use strict";
/**
 * Graph Factory
 *
 * Generates test graph structures with nodes and relationships
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphFactory = graphFactory;
exports.simpleGraphFactory = simpleGraphFactory;
exports.starGraphFactory = starGraphFactory;
const entityFactory_1 = require("./entityFactory");
const relationshipFactory_1 = require("./relationshipFactory");
/**
 * Create a test graph with nodes and relationships
 */
function graphFactory(options = {}) {
    const nodeCount = options.nodeCount || 10;
    const relationshipDensity = options.relationshipDensity || 0.3;
    const nodeTypes = options.nodeTypes || ['person', 'organization', 'ipAddress', 'domain'];
    // Create nodes
    const nodes = Array.from({ length: nodeCount }, () => {
        const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        return (0, entityFactory_1.entityFactory)({ type });
    });
    // Create relationships based on density
    const relationships = [];
    const maxRelationships = (nodeCount * (nodeCount - 1)) / 2;
    const targetRelationshipCount = Math.floor(maxRelationships * relationshipDensity);
    const usedPairs = new Set();
    for (let i = 0; i < targetRelationshipCount; i++) {
        let sourceIdx = Math.floor(Math.random() * nodeCount);
        let targetIdx = Math.floor(Math.random() * nodeCount);
        // Ensure source and target are different
        while (sourceIdx === targetIdx) {
            targetIdx = Math.floor(Math.random() * nodeCount);
        }
        const pairKey = `${Math.min(sourceIdx, targetIdx)}-${Math.max(sourceIdx, targetIdx)}`;
        // Skip if we've already created a relationship between these nodes
        if (usedPairs.has(pairKey)) {
            continue;
        }
        usedPairs.add(pairKey);
        relationships.push((0, relationshipFactory_1.relationshipFactory)({
            sourceId: nodes[sourceIdx].id,
            targetId: nodes[targetIdx].id,
            type: 'RELATED_TO',
        }));
    }
    return { nodes, relationships };
}
/**
 * Create a simple graph with a specific structure
 */
function simpleGraphFactory() {
    const person = (0, entityFactory_1.entityFactory)({ type: 'person', name: 'John Doe' });
    const org = (0, entityFactory_1.entityFactory)({ type: 'organization', name: 'Acme Corp' });
    const ip = (0, entityFactory_1.entityFactory)({ type: 'ipAddress', name: '192.168.1.1' });
    return {
        nodes: [person, org, ip],
        relationships: [
            (0, relationshipFactory_1.relationshipFactory)({
                sourceId: person.id,
                targetId: org.id,
                type: 'WORKS_AT',
            }),
            (0, relationshipFactory_1.relationshipFactory)({
                sourceId: person.id,
                targetId: ip.id,
                type: 'ACCESSED',
            }),
        ],
    };
}
/**
 * Create a star graph (one central node connected to many peripheral nodes)
 */
function starGraphFactory(peripheralCount = 5) {
    const centralNode = (0, entityFactory_1.entityFactory)({ type: 'person', name: 'Central Node' });
    const peripheralNodes = Array.from({ length: peripheralCount }, (_, i) => (0, entityFactory_1.entityFactory)({ type: 'person', name: `Peripheral Node ${i + 1}` }));
    const relationships = peripheralNodes.map((node) => (0, relationshipFactory_1.relationshipFactory)({
        sourceId: centralNode.id,
        targetId: node.id,
        type: 'CONNECTED_TO',
    }));
    return {
        nodes: [centralNode, ...peripheralNodes],
        relationships,
    };
}
