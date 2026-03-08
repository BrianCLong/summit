"use strict";
/**
 * Enhanced Graph Factory
 *
 * Type-safe factory for generating complex test graph structures.
 * Supports various graph patterns like star, chain, mesh, and hierarchical.
 *
 * @module tests/factories/enhanced
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRandomGraph = createRandomGraph;
exports.createStarGraph = createStarGraph;
exports.createChainGraph = createChainGraph;
exports.createCompleteGraph = createCompleteGraph;
exports.createTreeGraph = createTreeGraph;
exports.createBipartiteGraph = createBipartiteGraph;
exports.createThreatIntelGraph = createThreatIntelGraph;
exports.createInvestigationGraph = createInvestigationGraph;
const base_1 = require("../base");
const EnhancedEntityFactory_1 = require("./EnhancedEntityFactory");
const EnhancedRelationshipFactory_1 = require("./EnhancedRelationshipFactory");
/**
 * Create a random graph with specified parameters
 */
function createRandomGraph(options = {}) {
    const nodeCount = options.nodeCount || 10;
    const relationshipDensity = options.relationshipDensity || 0.3;
    const nodeTypes = options.nodeTypes || ['person', 'organization', 'ipAddress', 'domain'];
    const relationshipTypes = options.relationshipTypes || ['RELATED_TO', 'CONNECTED_TO', 'COMMUNICATES_WITH'];
    // Create nodes
    const nodes = Array.from({ length: nodeCount }, () => {
        const type = base_1.random.pick(nodeTypes);
        return EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait(type, {
            investigationId: options.investigationId || null,
        });
    });
    // Create relationships based on density
    const relationships = [];
    const maxRelationships = (nodeCount * (nodeCount - 1)) / 2;
    const targetRelationshipCount = Math.floor(maxRelationships * relationshipDensity);
    const usedPairs = new Set();
    for (let i = 0; i < targetRelationshipCount && i < maxRelationships; i++) {
        let sourceIdx = Math.floor(Math.random() * nodeCount);
        let targetIdx = Math.floor(Math.random() * nodeCount);
        // Ensure source and target are different
        let attempts = 0;
        while (sourceIdx === targetIdx && attempts < 10) {
            targetIdx = Math.floor(Math.random() * nodeCount);
            attempts++;
        }
        if (sourceIdx === targetIdx)
            continue;
        const pairKey = `${Math.min(sourceIdx, targetIdx)}-${Math.max(sourceIdx, targetIdx)}`;
        if (usedPairs.has(pairKey))
            continue;
        usedPairs.add(pairKey);
        relationships.push((0, EnhancedRelationshipFactory_1.createRelationshipBetween)(nodes[sourceIdx].id, nodes[targetIdx].id, base_1.random.pick(relationshipTypes), { investigationId: options.investigationId || null }));
    }
    const actualDensity = relationships.length / maxRelationships;
    const averageDegree = (2 * relationships.length) / nodeCount;
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: actualDensity,
            averageDegree,
            createdAt: new Date(),
        },
    };
}
/**
 * Create a star graph (one central node connected to many peripheral nodes)
 */
function createStarGraph(peripheralCount = 5, options = {}) {
    const centralNode = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('organization', {
        name: 'Central Hub',
        investigationId: options.investigationId || null,
    });
    const peripheralNodes = Array.from({ length: peripheralCount }, (_, i) => EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('person', {
        name: `Peripheral Node ${i + 1}`,
        investigationId: options.investigationId || null,
    }));
    const nodes = [centralNode, ...peripheralNodes];
    const relationships = (0, EnhancedRelationshipFactory_1.createHubRelationships)(centralNode.id, peripheralNodes.map((n) => n.id), 'CONNECTED_TO');
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: relationships.length / ((nodes.length * (nodes.length - 1)) / 2),
            averageDegree: (2 * relationships.length) / nodes.length,
            createdAt: new Date(),
        },
    };
}
/**
 * Create a chain graph (linear sequence of connected nodes)
 */
function createChainGraph(length = 5, options = {}) {
    const nodeTypes = options.nodeTypes || ['person', 'ipAddress', 'domain'];
    const nodes = Array.from({ length }, (_, i) => EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait(nodeTypes[i % nodeTypes.length], {
        name: `Chain Node ${i + 1}`,
        investigationId: options.investigationId || null,
    }));
    const relationships = (0, EnhancedRelationshipFactory_1.createRelationshipChain)(nodes.map((n) => n.id), 'CONNECTED_TO');
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: relationships.length / ((nodes.length * (nodes.length - 1)) / 2),
            averageDegree: (2 * relationships.length) / nodes.length,
            createdAt: new Date(),
        },
    };
}
/**
 * Create a complete graph (every node connected to every other node)
 */
function createCompleteGraph(nodeCount = 5, options = {}) {
    const nodeTypes = options.nodeTypes || ['person'];
    const nodes = Array.from({ length: nodeCount }, (_, i) => EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait(base_1.random.pick(nodeTypes), {
        name: `Complete Graph Node ${i + 1}`,
        investigationId: options.investigationId || null,
    }));
    const relationships = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            relationships.push((0, EnhancedRelationshipFactory_1.createRelationshipBetween)(nodes[i].id, nodes[j].id, 'RELATED_TO', {
                investigationId: options.investigationId || null,
            }));
        }
    }
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: 1.0, // Complete graph has density of 1
            averageDegree: nodes.length - 1,
            createdAt: new Date(),
        },
    };
}
/**
 * Create a hierarchical tree graph
 */
function createTreeGraph(depth = 3, branchingFactor = 2, options = {}) {
    const nodes = [];
    const relationships = [];
    function createLevel(parentId, currentDepth) {
        if (currentDepth > depth)
            return;
        const node = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('organization', {
            name: `Tree Node L${currentDepth}`,
            investigationId: options.investigationId || null,
        });
        nodes.push(node);
        if (parentId) {
            relationships.push((0, EnhancedRelationshipFactory_1.createRelationshipBetween)(parentId, node.id, 'REPORTS_TO', {
                investigationId: options.investigationId || null,
            }));
        }
        for (let i = 0; i < branchingFactor; i++) {
            createLevel(node.id, currentDepth + 1);
        }
    }
    createLevel(null, 1);
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: relationships.length / ((nodes.length * (nodes.length - 1)) / 2),
            averageDegree: (2 * relationships.length) / nodes.length,
            createdAt: new Date(),
        },
    };
}
/**
 * Create a bipartite graph (two groups of nodes, connections only between groups)
 */
function createBipartiteGraph(groupASize = 3, groupBSize = 4, connectionDensity = 0.5, options = {}) {
    const groupA = Array.from({ length: groupASize }, (_, i) => EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('person', {
        name: `Group A - Node ${i + 1}`,
        investigationId: options.investigationId || null,
        tags: ['group-a'],
    }));
    const groupB = Array.from({ length: groupBSize }, (_, i) => EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('organization', {
        name: `Group B - Node ${i + 1}`,
        investigationId: options.investigationId || null,
        tags: ['group-b'],
    }));
    const nodes = [...groupA, ...groupB];
    const relationships = [];
    // Create connections only between groups
    for (const nodeA of groupA) {
        for (const nodeB of groupB) {
            if (Math.random() < connectionDensity) {
                relationships.push((0, EnhancedRelationshipFactory_1.createRelationshipBetween)(nodeA.id, nodeB.id, 'WORKS_AT', {
                    investigationId: options.investigationId || null,
                }));
            }
        }
    }
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: relationships.length / (groupASize * groupBSize),
            averageDegree: (2 * relationships.length) / nodes.length,
            createdAt: new Date(),
        },
    };
}
/**
 * Create a threat intelligence graph with realistic entity types and relationships
 */
function createThreatIntelGraph(options = {}) {
    const investigationId = options.investigationId || base_1.random.uuid();
    // Create threat actor
    const threatActor = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTraits(['person', 'malicious'], {
        name: 'Threat Actor',
        investigationId,
        properties: {
            alias: base_1.random.pick(['APT29', 'Fancy Bear', 'Lazarus']),
            motivation: 'espionage',
        },
    });
    // Create malware
    const malware = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('malware', {
        investigationId,
    });
    // Create C2 infrastructure
    const c2Domain = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTraits(['domain', 'malicious'], {
        name: `c2-${base_1.random.string(8)}.com`,
        investigationId,
    });
    const c2IP = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTraits(['ipAddress', 'malicious'], {
        investigationId,
    });
    // Create targets
    const targetOrg = EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('organization', {
        name: 'Target Organization',
        investigationId,
    });
    const targetAssets = Array.from({ length: 3 }, () => EnhancedEntityFactory_1.enhancedEntityFactory.build({
        type: 'asset',
        investigationId,
    }));
    // Create indicators
    const indicators = Array.from({ length: 5 }, () => EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait('indicator', {
        investigationId,
    }));
    const nodes = [
        threatActor,
        malware,
        c2Domain,
        c2IP,
        targetOrg,
        ...targetAssets,
        ...indicators,
    ];
    const relationships = [
        // Threat actor uses malware
        (0, EnhancedRelationshipFactory_1.createRelationshipBetween)(threatActor.id, malware.id, 'USES', { investigationId }),
        // Malware communicates with C2
        (0, EnhancedRelationshipFactory_1.createRelationshipBetween)(malware.id, c2Domain.id, 'COMMUNICATES_WITH', { investigationId }),
        (0, EnhancedRelationshipFactory_1.createRelationshipBetween)(c2Domain.id, c2IP.id, 'RESOLVED_TO', { investigationId }),
        // Threat actor targets organization
        (0, EnhancedRelationshipFactory_1.createRelationshipBetween)(threatActor.id, targetOrg.id, 'TARGETS', { investigationId }),
        // Organization owns assets
        ...targetAssets.map((asset) => (0, EnhancedRelationshipFactory_1.createRelationshipBetween)(targetOrg.id, asset.id, 'OWNS', { investigationId })),
        // Indicators indicate malware
        ...indicators.map((indicator) => (0, EnhancedRelationshipFactory_1.createRelationshipBetween)(indicator.id, malware.id, 'INDICATES', { investigationId })),
    ];
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: relationships.length / ((nodes.length * (nodes.length - 1)) / 2),
            averageDegree: (2 * relationships.length) / nodes.length,
            createdAt: new Date(),
        },
    };
}
/**
 * Create an investigation graph with realistic data
 */
function createInvestigationGraph(entityCount = 20, options = {}) {
    const investigationId = options.investigationId || base_1.random.uuid();
    // Create a mix of entity types
    const nodes = [];
    const entityTypes = ['person', 'organization', 'ipAddress', 'domain', 'email'];
    for (let i = 0; i < entityCount; i++) {
        const type = entityTypes[i % entityTypes.length];
        nodes.push(EnhancedEntityFactory_1.enhancedEntityFactory.buildWithTrait(type, {
            investigationId,
        }));
    }
    // Create relationships with various types
    const relationships = [];
    const relationshipTypes = [
        'RELATED_TO',
        'CONNECTED_TO',
        'COMMUNICATES_WITH',
        'WORKS_AT',
        'RESOLVED_TO',
    ];
    // Create a connected graph
    for (let i = 0; i < nodes.length - 1; i++) {
        relationships.push((0, EnhancedRelationshipFactory_1.createRelationshipBetween)(nodes[i].id, nodes[i + 1].id, base_1.random.pick(relationshipTypes), { investigationId }));
    }
    // Add some cross-connections
    const crossConnectionCount = Math.floor(entityCount * 0.3);
    for (let i = 0; i < crossConnectionCount; i++) {
        const sourceIdx = base_1.random.number(0, nodes.length - 1);
        let targetIdx = base_1.random.number(0, nodes.length - 1);
        while (targetIdx === sourceIdx) {
            targetIdx = base_1.random.number(0, nodes.length - 1);
        }
        relationships.push((0, EnhancedRelationshipFactory_1.createRelationshipBetween)(nodes[sourceIdx].id, nodes[targetIdx].id, base_1.random.pick(relationshipTypes), { investigationId }));
    }
    return {
        nodes,
        relationships,
        metadata: {
            nodeCount: nodes.length,
            relationshipCount: relationships.length,
            density: relationships.length / ((nodes.length * (nodes.length - 1)) / 2),
            averageDegree: (2 * relationships.length) / nodes.length,
            createdAt: new Date(),
        },
    };
}
exports.default = {
    createRandomGraph,
    createStarGraph,
    createChainGraph,
    createCompleteGraph,
    createTreeGraph,
    createBipartiteGraph,
    createThreatIntelGraph,
    createInvestigationGraph,
};
