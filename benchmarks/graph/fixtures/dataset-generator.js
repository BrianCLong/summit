/**
 * Synthetic graph dataset generator for Neo4j benchmarks
 *
 * Generates realistic investigation graphs with:
 * - Entities: Person, Organization, Asset, Communication
 * - Relationships: KNOWS, WORKS_FOR, OWNS, COMMUNICATES_WITH
 * - Properties: Realistic metadata with timestamps, confidence scores
 */

import crypto from 'crypto';

export const DATASET_SIZES = {
  small: { nodes: 100, edges: 250 },
  medium: { nodes: 1000, edges: 3000 },
  large: { nodes: 10000, edges: 30000 },
  xl: { nodes: 50000, edges: 150000 }
};

const ENTITY_TYPES = ['Person', 'Organization', 'Asset', 'Communication'];
const RELATIONSHIP_TYPES = ['KNOWS', 'WORKS_FOR', 'OWNS', 'COMMUNICATES_WITH', 'RELATED_TO'];

/**
 * Generate a synthetic graph dataset
 * @param {string} size - Dataset size: small, medium, large, xl
 * @param {string} seed - Random seed for reproducibility
 * @returns {Object} { nodes, edges, metadata }
 */
export function generateDataset(size = 'small', seed = 'benchmark') {
  const config = DATASET_SIZES[size];
  if (!config) {
    throw new Error(`Invalid size: ${size}. Use: ${Object.keys(DATASET_SIZES).join(', ')}`);
  }

  const rng = seededRandom(seed);
  const investigationId = `inv-${seed}-${size}`;
  const tenantId = 'benchmark-tenant';

  // Generate nodes
  const nodes = [];
  for (let i = 0; i < config.nodes; i++) {
    const type = ENTITY_TYPES[Math.floor(rng() * ENTITY_TYPES.length)];
    nodes.push({
      id: `entity-${i}`,
      uuid: crypto.randomUUID(),
      investigationId,
      tenantId,
      type,
      label: `${type} ${i}`,
      properties: {
        name: `${type} ${i}`,
        description: `Synthetic ${type.toLowerCase()} for benchmarking`,
        createdAt: Date.now() - Math.floor(rng() * 365 * 24 * 60 * 60 * 1000),
        confidence: 0.5 + rng() * 0.5,
        tags: generateTags(rng, 2, 5)
      }
    });
  }

  // Generate edges with scale-free distribution (preferential attachment)
  const edges = [];
  const nodeDegrees = new Array(config.nodes).fill(0);

  for (let i = 0; i < config.edges; i++) {
    // Preferential attachment: nodes with higher degree more likely to get new edges
    let srcIdx, dstIdx;

    if (i < config.nodes) {
      // Initial edges: connect sequentially to ensure connectivity
      srcIdx = i;
      dstIdx = (i + 1) % config.nodes;
    } else {
      // Preferential attachment for remaining edges
      srcIdx = selectNodePreferential(nodeDegrees, rng);
      dstIdx = selectNodePreferential(nodeDegrees, rng);

      // Avoid self-loops and duplicate edges
      let attempts = 0;
      while ((srcIdx === dstIdx || edgeExists(edges, srcIdx, dstIdx)) && attempts < 100) {
        dstIdx = selectNodePreferential(nodeDegrees, rng);
        attempts++;
      }

      if (attempts >= 100) continue; // Skip if can't find valid edge
    }

    const relType = RELATIONSHIP_TYPES[Math.floor(rng() * RELATIONSHIP_TYPES.length)];
    edges.push({
      id: `rel-${i}`,
      uuid: crypto.randomUUID(),
      investigationId,
      tenantId,
      type: relType,
      srcId: nodes[srcIdx].id,
      dstId: nodes[dstIdx].id,
      label: relType.toLowerCase().replace(/_/g, ' '),
      properties: {
        createdAt: Date.now() - Math.floor(rng() * 365 * 24 * 60 * 60 * 1000),
        confidence: 0.5 + rng() * 0.5,
        weight: rng()
      }
    });

    nodeDegrees[srcIdx]++;
    nodeDegrees[dstIdx]++;
  }

  return {
    nodes,
    edges,
    metadata: {
      size,
      seed,
      investigationId,
      tenantId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      avgDegree: (edges.length * 2) / nodes.length,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate Cypher statements to load dataset into Neo4j
 */
export function generateCypherStatements(dataset) {
  const statements = [];

  // Create constraints (run once)
  statements.push({
    query: 'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
    params: {}
  });

  // Clear existing data for this investigation
  statements.push({
    query: 'MATCH (n {investigationId: $investigationId}) DETACH DELETE n',
    params: { investigationId: dataset.metadata.investigationId }
  });

  // Batch insert nodes (batch size 1000 for efficiency)
  const nodeBatches = batchArray(dataset.nodes, 1000);
  for (const batch of nodeBatches) {
    statements.push({
      query: `
        UNWIND $nodes AS node
        CREATE (e:Entity)
        SET e = node,
            e.createdAt = timestamp()
      `,
      params: { nodes: batch }
    });
  }

  // Batch insert edges
  const edgeBatches = batchArray(dataset.edges, 1000);
  for (const batch of edgeBatches) {
    statements.push({
      query: `
        UNWIND $edges AS edge
        MATCH (src:Entity {id: edge.srcId})
        MATCH (dst:Entity {id: edge.dstId})
        CREATE (src)-[r:RELATIONSHIP]->(dst)
        SET r = edge,
            r.createdAt = timestamp()
      `,
      params: { edges: batch }
    });
  }

  // Create indexes for performance
  statements.push({
    query: 'CREATE INDEX entity_investigation IF NOT EXISTS FOR (e:Entity) ON (e.investigationId)',
    params: {}
  });

  return statements;
}

// Helper functions

function seededRandom(seed) {
  let value = hashCode(seed);
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateTags(rng, min, max) {
  const count = min + Math.floor(rng() * (max - min + 1));
  const tags = ['financial', 'suspicious', 'verified', 'high-risk', 'domestic', 'international'];
  return Array.from({ length: count }, () => tags[Math.floor(rng() * tags.length)]);
}

function selectNodePreferential(degrees, rng) {
  const totalDegree = degrees.reduce((a, b) => a + b, 0) + degrees.length; // +length for initial probability
  let threshold = rng() * totalDegree;

  for (let i = 0; i < degrees.length; i++) {
    threshold -= (degrees[i] + 1);
    if (threshold <= 0) return i;
  }

  return degrees.length - 1;
}

function edgeExists(edges, srcIdx, dstIdx) {
  return edges.some(e =>
    (e.srcId === `entity-${srcIdx}` && e.dstId === `entity-${dstIdx}`) ||
    (e.srcId === `entity-${dstIdx}` && e.dstId === `entity-${srcIdx}`)
  );
}

function batchArray(arr, size) {
  const batches = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}
