/**
 * Enhanced Graph Factory
 *
 * Type-safe factory for generating complex test graph structures.
 * Supports various graph patterns like star, chain, mesh, and hierarchical.
 *
 * @module tests/factories/enhanced
 */

import { random } from '../base';
import {
  enhancedEntityFactory,
  type TestEntityEnhanced,
  type EntityType,
} from './EnhancedEntityFactory';
import {
  enhancedRelationshipFactory,
  createRelationshipBetween,
  createRelationshipChain,
  createHubRelationships,
  type TestRelationshipEnhanced,
  type RelationshipType,
} from './EnhancedRelationshipFactory';

/**
 * Complete graph structure
 */
export interface TestGraphEnhanced {
  nodes: TestEntityEnhanced[];
  relationships: TestRelationshipEnhanced[];
  metadata: {
    nodeCount: number;
    relationshipCount: number;
    density: number;
    averageDegree: number;
    createdAt: Date;
  };
}

/**
 * Graph factory options
 */
export interface GraphFactoryOptions {
  nodeCount?: number;
  relationshipDensity?: number;
  nodeTypes?: EntityType[];
  relationshipTypes?: RelationshipType[];
  investigationId?: string;
}

/**
 * Create a random graph with specified parameters
 */
export function createRandomGraph(options: GraphFactoryOptions = {}): TestGraphEnhanced {
  const nodeCount = options.nodeCount || 10;
  const relationshipDensity = options.relationshipDensity || 0.3;
  const nodeTypes = options.nodeTypes || ['person', 'organization', 'ipAddress', 'domain'];
  const relationshipTypes = options.relationshipTypes || ['RELATED_TO', 'CONNECTED_TO', 'COMMUNICATES_WITH'];

  // Create nodes
  const nodes: TestEntityEnhanced[] = Array.from({ length: nodeCount }, () => {
    const type = random.pick(nodeTypes);
    return enhancedEntityFactory.buildWithTrait(type, {
      investigationId: options.investigationId || null,
    });
  });

  // Create relationships based on density
  const relationships: TestRelationshipEnhanced[] = [];
  const maxRelationships = (nodeCount * (nodeCount - 1)) / 2;
  const targetRelationshipCount = Math.floor(maxRelationships * relationshipDensity);
  const usedPairs = new Set<string>();

  for (let i = 0; i < targetRelationshipCount && i < maxRelationships; i++) {
    let sourceIdx = Math.floor(Math.random() * nodeCount);
    let targetIdx = Math.floor(Math.random() * nodeCount);

    // Ensure source and target are different
    let attempts = 0;
    while (sourceIdx === targetIdx && attempts < 10) {
      targetIdx = Math.floor(Math.random() * nodeCount);
      attempts++;
    }

    if (sourceIdx === targetIdx) continue;

    const pairKey = `${Math.min(sourceIdx, targetIdx)}-${Math.max(sourceIdx, targetIdx)}`;
    if (usedPairs.has(pairKey)) continue;

    usedPairs.add(pairKey);

    relationships.push(
      createRelationshipBetween(
        nodes[sourceIdx].id,
        nodes[targetIdx].id,
        random.pick(relationshipTypes),
        { investigationId: options.investigationId || null }
      )
    );
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
export function createStarGraph(
  peripheralCount: number = 5,
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const centralNode = enhancedEntityFactory.buildWithTrait('organization', {
    name: 'Central Hub',
    investigationId: options.investigationId || null,
  });

  const peripheralNodes = Array.from({ length: peripheralCount }, (_, i) =>
    enhancedEntityFactory.buildWithTrait('person', {
      name: `Peripheral Node ${i + 1}`,
      investigationId: options.investigationId || null,
    })
  );

  const nodes = [centralNode, ...peripheralNodes];
  const relationships = createHubRelationships(
    centralNode.id,
    peripheralNodes.map((n) => n.id),
    'CONNECTED_TO'
  );

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
export function createChainGraph(
  length: number = 5,
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const nodeTypes = options.nodeTypes || ['person', 'ipAddress', 'domain'];

  const nodes = Array.from({ length }, (_, i) =>
    enhancedEntityFactory.buildWithTrait(nodeTypes[i % nodeTypes.length], {
      name: `Chain Node ${i + 1}`,
      investigationId: options.investigationId || null,
    })
  );

  const relationships = createRelationshipChain(
    nodes.map((n) => n.id),
    'CONNECTED_TO'
  );

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
export function createCompleteGraph(
  nodeCount: number = 5,
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const nodeTypes = options.nodeTypes || ['person'];

  const nodes = Array.from({ length: nodeCount }, (_, i) =>
    enhancedEntityFactory.buildWithTrait(random.pick(nodeTypes), {
      name: `Complete Graph Node ${i + 1}`,
      investigationId: options.investigationId || null,
    })
  );

  const relationships: TestRelationshipEnhanced[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      relationships.push(
        createRelationshipBetween(nodes[i].id, nodes[j].id, 'RELATED_TO', {
          investigationId: options.investigationId || null,
        })
      );
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
export function createTreeGraph(
  depth: number = 3,
  branchingFactor: number = 2,
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const nodes: TestEntityEnhanced[] = [];
  const relationships: TestRelationshipEnhanced[] = [];

  function createLevel(parentId: string | null, currentDepth: number): void {
    if (currentDepth > depth) return;

    const node = enhancedEntityFactory.buildWithTrait('organization', {
      name: `Tree Node L${currentDepth}`,
      investigationId: options.investigationId || null,
    });
    nodes.push(node);

    if (parentId) {
      relationships.push(
        createRelationshipBetween(parentId, node.id, 'REPORTS_TO', {
          investigationId: options.investigationId || null,
        })
      );
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
export function createBipartiteGraph(
  groupASize: number = 3,
  groupBSize: number = 4,
  connectionDensity: number = 0.5,
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const groupA = Array.from({ length: groupASize }, (_, i) =>
    enhancedEntityFactory.buildWithTrait('person', {
      name: `Group A - Node ${i + 1}`,
      investigationId: options.investigationId || null,
      tags: ['group-a'],
    })
  );

  const groupB = Array.from({ length: groupBSize }, (_, i) =>
    enhancedEntityFactory.buildWithTrait('organization', {
      name: `Group B - Node ${i + 1}`,
      investigationId: options.investigationId || null,
      tags: ['group-b'],
    })
  );

  const nodes = [...groupA, ...groupB];
  const relationships: TestRelationshipEnhanced[] = [];

  // Create connections only between groups
  for (const nodeA of groupA) {
    for (const nodeB of groupB) {
      if (Math.random() < connectionDensity) {
        relationships.push(
          createRelationshipBetween(nodeA.id, nodeB.id, 'WORKS_AT', {
            investigationId: options.investigationId || null,
          })
        );
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
export function createThreatIntelGraph(
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const investigationId = options.investigationId || random.uuid();

  // Create threat actor
  const threatActor = enhancedEntityFactory.buildWithTraits(['person', 'malicious'], {
    name: 'Threat Actor',
    investigationId,
    properties: {
      alias: random.pick(['APT29', 'Fancy Bear', 'Lazarus']),
      motivation: 'espionage',
    },
  });

  // Create malware
  const malware = enhancedEntityFactory.buildWithTrait('malware', {
    investigationId,
  });

  // Create C2 infrastructure
  const c2Domain = enhancedEntityFactory.buildWithTraits(['domain', 'malicious'], {
    name: `c2-${random.string(8)}.com`,
    investigationId,
  });

  const c2IP = enhancedEntityFactory.buildWithTraits(['ipAddress', 'malicious'], {
    investigationId,
  });

  // Create targets
  const targetOrg = enhancedEntityFactory.buildWithTrait('organization', {
    name: 'Target Organization',
    investigationId,
  });

  const targetAssets = Array.from({ length: 3 }, () =>
    enhancedEntityFactory.build({
      type: 'asset',
      investigationId,
    })
  );

  // Create indicators
  const indicators = Array.from({ length: 5 }, () =>
    enhancedEntityFactory.buildWithTrait('indicator', {
      investigationId,
    })
  );

  const nodes = [
    threatActor,
    malware,
    c2Domain,
    c2IP,
    targetOrg,
    ...targetAssets,
    ...indicators,
  ];

  const relationships: TestRelationshipEnhanced[] = [
    // Threat actor uses malware
    createRelationshipBetween(threatActor.id, malware.id, 'USES', { investigationId }),

    // Malware communicates with C2
    createRelationshipBetween(malware.id, c2Domain.id, 'COMMUNICATES_WITH', { investigationId }),
    createRelationshipBetween(c2Domain.id, c2IP.id, 'RESOLVED_TO', { investigationId }),

    // Threat actor targets organization
    createRelationshipBetween(threatActor.id, targetOrg.id, 'TARGETS', { investigationId }),

    // Organization owns assets
    ...targetAssets.map((asset) =>
      createRelationshipBetween(targetOrg.id, asset.id, 'OWNS', { investigationId })
    ),

    // Indicators indicate malware
    ...indicators.map((indicator) =>
      createRelationshipBetween(indicator.id, malware.id, 'INDICATES', { investigationId })
    ),
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
export function createInvestigationGraph(
  entityCount: number = 20,
  options: Partial<GraphFactoryOptions> = {}
): TestGraphEnhanced {
  const investigationId = options.investigationId || random.uuid();

  // Create a mix of entity types
  const nodes: TestEntityEnhanced[] = [];
  const entityTypes: EntityType[] = ['person', 'organization', 'ipAddress', 'domain', 'email'];

  for (let i = 0; i < entityCount; i++) {
    const type = entityTypes[i % entityTypes.length];
    nodes.push(
      enhancedEntityFactory.buildWithTrait(type, {
        investigationId,
      })
    );
  }

  // Create relationships with various types
  const relationships: TestRelationshipEnhanced[] = [];
  const relationshipTypes: RelationshipType[] = [
    'RELATED_TO',
    'CONNECTED_TO',
    'COMMUNICATES_WITH',
    'WORKS_AT',
    'RESOLVED_TO',
  ];

  // Create a connected graph
  for (let i = 0; i < nodes.length - 1; i++) {
    relationships.push(
      createRelationshipBetween(
        nodes[i].id,
        nodes[i + 1].id,
        random.pick(relationshipTypes),
        { investigationId }
      )
    );
  }

  // Add some cross-connections
  const crossConnectionCount = Math.floor(entityCount * 0.3);
  for (let i = 0; i < crossConnectionCount; i++) {
    const sourceIdx = random.number(0, nodes.length - 1);
    let targetIdx = random.number(0, nodes.length - 1);
    while (targetIdx === sourceIdx) {
      targetIdx = random.number(0, nodes.length - 1);
    }

    relationships.push(
      createRelationshipBetween(
        nodes[sourceIdx].id,
        nodes[targetIdx].id,
        random.pick(relationshipTypes),
        { investigationId }
      )
    );
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

export default {
  createRandomGraph,
  createStarGraph,
  createChainGraph,
  createCompleteGraph,
  createTreeGraph,
  createBipartiteGraph,
  createThreatIntelGraph,
  createInvestigationGraph,
};
