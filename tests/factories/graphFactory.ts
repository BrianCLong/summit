/**
 * Graph Factory
 *
 * Generates test graph structures with nodes and relationships
 */

import { entityFactory, type TestEntity } from './entityFactory';
import { relationshipFactory, type TestRelationship } from './relationshipFactory';

export interface TestGraph {
  nodes: TestEntity[];
  relationships: TestRelationship[];
}

export interface GraphFactoryOptions {
  nodeCount?: number;
  relationshipDensity?: number; // 0.0 to 1.0
  nodeTypes?: string[];
}

/**
 * Create a test graph with nodes and relationships
 */
export function graphFactory(options: GraphFactoryOptions = {}): TestGraph {
  const nodeCount = options.nodeCount || 10;
  const relationshipDensity = options.relationshipDensity || 0.3;
  const nodeTypes = options.nodeTypes || ['person', 'organization', 'ipAddress', 'domain'];

  // Create nodes
  const nodes: TestEntity[] = Array.from({ length: nodeCount }, () => {
    const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    return entityFactory({ type });
  });

  // Create relationships based on density
  const relationships: TestRelationship[] = [];
  const maxRelationships = (nodeCount * (nodeCount - 1)) / 2;
  const targetRelationshipCount = Math.floor(maxRelationships * relationshipDensity);

  const usedPairs = new Set<string>();

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

    relationships.push(
      relationshipFactory({
        sourceId: nodes[sourceIdx].id,
        targetId: nodes[targetIdx].id,
        type: 'RELATED_TO',
      })
    );
  }

  return { nodes, relationships };
}

/**
 * Create a simple graph with a specific structure
 */
export function simpleGraphFactory(): TestGraph {
  const person = entityFactory({ type: 'person', name: 'John Doe' });
  const org = entityFactory({ type: 'organization', name: 'Acme Corp' });
  const ip = entityFactory({ type: 'ipAddress', name: '192.168.1.1' });

  return {
    nodes: [person, org, ip],
    relationships: [
      relationshipFactory({
        sourceId: person.id,
        targetId: org.id,
        type: 'WORKS_AT',
      }),
      relationshipFactory({
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
export function starGraphFactory(peripheralCount: number = 5): TestGraph {
  const centralNode = entityFactory({ type: 'person', name: 'Central Node' });
  const peripheralNodes = Array.from({ length: peripheralCount }, (_, i) =>
    entityFactory({ type: 'person', name: `Peripheral Node ${i + 1}` })
  );

  const relationships = peripheralNodes.map((node) =>
    relationshipFactory({
      sourceId: centralNode.id,
      targetId: node.id,
      type: 'CONNECTED_TO',
    })
  );

  return {
    nodes: [centralNode, ...peripheralNodes],
    relationships,
  };
}
