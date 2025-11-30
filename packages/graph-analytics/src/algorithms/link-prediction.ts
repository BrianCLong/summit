/**
 * Link Prediction and Similarity Algorithms
 *
 * Predicts potential future connections and measures similarity between nodes.
 * Critical for intelligence analysis to identify hidden relationships, predict
 * future collaborations, and find similar entities.
 *
 * @module algorithms/link-prediction
 */

export interface GraphData {
  nodes: string[];
  edges: { source: string; target: string; weight?: number }[];
}

export interface CandidateEdge {
  source: string;
  target: string;
}

export interface CandidateEdgeOptions {
  /**
   * Limit candidate generation to non-existing edges
   */
  onlyNonExisting?: boolean;

  /**
   * Maximum number of candidate edges to return (to bound complexity)
   */
  maxCandidates?: number;

  /**
   * Randomize before truncating to reduce bias when sampling
   */
  randomize?: boolean;

  /**
   * Provide pre-built adjacency/edge cache to avoid recomputation
   */
  adjacency?: Map<string, Set<string>>;
  existingEdges?: Set<string>;
}

export interface LinkPredictionResult {
  /**
   * Predicted links with scores
   */
  predictions: Array<{
    source: string;
    target: string;
    score: number;
    method: string;
  }>;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;
}

export interface SimilarityResult {
  /**
   * Similarity scores between node pairs
   */
  similarities: Map<string, Map<string, number>>;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Method used
   */
  method: string;
}

export interface LinkPredictionOptions {
  /**
   * Methods to use for prediction
   */
  methods?: Array<
    | 'common-neighbors'
    | 'jaccard'
    | 'adamic-adar'
    | 'preferential-attachment'
    | 'resource-allocation'
  >;

  /**
   * Minimum score threshold
   */
  minScore?: number;

  /**
   * Maximum number of predictions per method
   */
  topK?: number;

  /**
   * Only predict between nodes that don't have edges
   */
  onlyNonExisting?: boolean;

  /**
   * Optional explicit candidate edge list to score
   */
  candidateEdges?: CandidateEdge[];

  /**
   * Maximum candidates to consider when auto-generating pairs
   */
  maxCandidates?: number;

  /**
   * Randomize candidate sampling when limiting size
   */
  randomizeCandidates?: boolean;
}

function buildAdjacency(graph: GraphData) {
  const adjacency = new Map<string, Set<string>>();
  const existingEdges = new Set<string>();

  for (const node of graph.nodes) {
    adjacency.set(node, new Set());
  }

  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());

    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    existingEdges.add(`${edge.source}-${edge.target}`);
    existingEdges.add(`${edge.target}-${edge.source}`);
  }

  return { adjacency, existingEdges };
}

function deriveExistingEdges(
  adjacency: Map<string, Set<string>>,
): Set<string> {
  const edges = new Set<string>();
  for (const [node, neighbors] of adjacency) {
    for (const neighbor of neighbors) {
      edges.add(`${node}-${neighbor}`);
    }
  }
  return edges;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function collectCandidates(
  nodes: string[],
  adjacency: Map<string, Set<string>>,
  existingEdges: Set<string>,
  options: CandidateEdgeOptions,
): CandidateEdge[] {
  const {
    onlyNonExisting = true,
    maxCandidates,
    randomize = false,
  } = options;

  const pairs: CandidateEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i];
      const target = nodes[j];
      const edgeKey = `${source}-${target}`;

      if (onlyNonExisting && existingEdges.has(edgeKey)) continue;

      // Skip if nodes were never registered in adjacency (safety for partial graphs)
      if (!adjacency.has(source) || !adjacency.has(target)) continue;

      pairs.push({ source, target });
    }
  }

  if (maxCandidates && pairs.length > maxCandidates) {
    if (randomize) {
      shuffleInPlace(pairs);
    }
    return pairs.slice(0, maxCandidates);
  }

  return pairs;
}

/**
 * Enumerate candidate edges from a graph for downstream scoring or GNN inference.
 */
export function generateCandidateEdges(
  graph: GraphData,
  options: CandidateEdgeOptions = {},
): CandidateEdge[] {
  const { adjacency, existingEdges } = options.adjacency
    ? {
        adjacency: options.adjacency,
        existingEdges:
          options.existingEdges || deriveExistingEdges(options.adjacency),
      }
    : buildAdjacency(graph);

  return collectCandidates(graph.nodes, adjacency, existingEdges, options);
}

/**
 * Predicts potential future links using multiple methods
 *
 * @param graph - Graph data
 * @param options - Prediction options
 * @returns Link predictions with scores
 */
export function predictLinks(
  graph: GraphData,
  options: LinkPredictionOptions = {},
): LinkPredictionResult {
  const startTime = performance.now();

  const {
    methods = ['common-neighbors', 'jaccard', 'adamic-adar'],
    minScore = 0,
    topK = 100,
    onlyNonExisting = true,
    candidateEdges,
    maxCandidates,
    randomizeCandidates = false,
  } = options;

  const { adjacency, existingEdges } = buildAdjacency(graph);

  const candidatePairs =
    candidateEdges ||
    generateCandidateEdges(graph, {
      adjacency,
      existingEdges,
      onlyNonExisting,
      maxCandidates,
      randomize: randomizeCandidates,
    });

  // Normalize candidates to remove duplicates and enforce constraints
  const normalizedCandidates: CandidateEdge[] = [];
  const seen = new Set<string>();

  for (const pair of candidatePairs) {
    const key = `${pair.source}-${pair.target}`;
    if (seen.has(key)) continue;

    if (onlyNonExisting && existingEdges.has(key)) continue;
    if (!adjacency.has(pair.source) || !adjacency.has(pair.target)) continue;

    normalizedCandidates.push(pair);
    seen.add(key);
  }

  const allPredictions: Array<{
    source: string;
    target: string;
    score: number;
    method: string;
  }> = [];

  // Apply each prediction method
  for (const method of methods) {
    let predictions: Array<{ source: string; target: string; score: number }> = [];

    switch (method) {
      case 'common-neighbors':
        predictions = commonNeighbors(adjacency, normalizedCandidates);
        break;
      case 'jaccard':
        predictions = jaccardCoefficient(adjacency, normalizedCandidates);
        break;
      case 'adamic-adar':
        predictions = adamicAdar(adjacency, normalizedCandidates);
        break;
      case 'preferential-attachment':
        predictions = preferentialAttachment(adjacency, normalizedCandidates);
        break;
      case 'resource-allocation':
        predictions = resourceAllocation(adjacency, normalizedCandidates);
        break;
    }

    // Filter and add method name
    for (const pred of predictions) {
      if (pred.score >= minScore) {
        if (!onlyNonExisting || !existingEdges.has(`${pred.source}-${pred.target}`)) {
          allPredictions.push({ ...pred, method });
        }
      }
    }
  }

  // Sort by score and take top K
  allPredictions.sort((a, b) => b.score - a.score);
  const topPredictions = allPredictions.slice(0, topK);

  const executionTime = performance.now() - startTime;

  return {
    predictions: topPredictions,
    executionTime,
  };
}

/**
 * Common Neighbors: Number of shared neighbors
 */
function commonNeighbors(
  adjacency: Map<string, Set<string>>,
  candidatePairs: CandidateEdge[],
): Array<{ source: string; target: string; score: number }> {
  const predictions: Array<{ source: string; target: string; score: number }> = [];

  for (const { source: nodeA, target: nodeB } of candidatePairs) {
    const neighborsA = adjacency.get(nodeA) || new Set();
    const neighborsB = adjacency.get(nodeB) || new Set();

    // Count common neighbors
    let commonCount = 0;
    for (const neighbor of neighborsA) {
      if (neighborsB.has(neighbor)) {
        commonCount++;
      }
    }

    if (commonCount > 0) {
      predictions.push({ source: nodeA, target: nodeB, score: commonCount });
    }
  }

  return predictions;
}

/**
 * Jaccard Coefficient: |Common Neighbors| / |Union of Neighbors|
 */
function jaccardCoefficient(
  adjacency: Map<string, Set<string>>,
  candidatePairs: CandidateEdge[],
): Array<{ source: string; target: string; score: number }> {
  const predictions: Array<{ source: string; target: string; score: number }> = [];

  for (const { source: nodeA, target: nodeB } of candidatePairs) {
    const neighborsA = adjacency.get(nodeA) || new Set();
    const neighborsB = adjacency.get(nodeB) || new Set();

    // Count common and union
    let commonCount = 0;
    const unionSet = new Set([...neighborsA, ...neighborsB]);

    for (const neighbor of neighborsA) {
      if (neighborsB.has(neighbor)) {
        commonCount++;
      }
    }

    if (unionSet.size > 0) {
      const score = commonCount / unionSet.size;
      if (score > 0) {
        predictions.push({ source: nodeA, target: nodeB, score });
      }
    }
  }

  return predictions;
}

/**
 * Adamic-Adar Index: Sum of 1/log(degree) for common neighbors
 * Gives more weight to common neighbors with fewer connections
 */
function adamicAdar(
  adjacency: Map<string, Set<string>>,
  candidatePairs: CandidateEdge[],
): Array<{ source: string; target: string; score: number }> {
  const predictions: Array<{ source: string; target: string; score: number }> = [];

  // Precompute degrees
  const degrees = new Map<string, number>();
  for (const [node, neighbors] of adjacency) {
    degrees.set(node, neighbors.size);
  }

  for (const { source: nodeA, target: nodeB } of candidatePairs) {
    const neighborsA = adjacency.get(nodeA) || new Set();
    const neighborsB = adjacency.get(nodeB) || new Set();

    let score = 0;
    for (const neighbor of neighborsA) {
      if (neighborsB.has(neighbor)) {
        const degree = degrees.get(neighbor) || 1;
        if (degree > 1) {
          score += 1 / Math.log(degree);
        }
      }
    }

    if (score > 0) {
      predictions.push({ source: nodeA, target: nodeB, score });
    }
  }

  return predictions;
}

/**
 * Preferential Attachment: Product of node degrees
 * Based on "rich get richer" principle
 */
function preferentialAttachment(
  adjacency: Map<string, Set<string>>,
  candidatePairs: CandidateEdge[],
): Array<{ source: string; target: string; score: number }> {
  const predictions: Array<{ source: string; target: string; score: number }> = [];

  for (const { source: nodeA, target: nodeB } of candidatePairs) {
    const degreeA = (adjacency.get(nodeA) || new Set()).size;
    const degreeB = (adjacency.get(nodeB) || new Set()).size;

    const score = degreeA * degreeB;
    if (score > 0) {
      predictions.push({ source: nodeA, target: nodeB, score });
    }
  }

  return predictions;
}

/**
 * Resource Allocation Index: Similar to Adamic-Adar but uses 1/degree
 */
function resourceAllocation(
  adjacency: Map<string, Set<string>>,
  candidatePairs: CandidateEdge[],
): Array<{ source: string; target: string; score: number }> {
  const predictions: Array<{ source: string; target: string; score: number }> = [];

  for (const { source: nodeA, target: nodeB } of candidatePairs) {
    const neighborsA = adjacency.get(nodeA) || new Set();
    const neighborsB = adjacency.get(nodeB) || new Set();

    let score = 0;
    for (const neighbor of neighborsA) {
      if (neighborsB.has(neighbor)) {
        const degree = (adjacency.get(neighbor) || new Set()).size;
        if (degree > 0) {
          score += 1 / degree;
        }
      }
    }

    if (score > 0) {
      predictions.push({ source: nodeA, target: nodeB, score });
    }
  }

  return predictions;
}

/**
 * Calculates cosine similarity between nodes based on their neighbors
 */
export function calculateCosineSimilarity(
  graph: GraphData,
  targetNodes?: string[],
): SimilarityResult {
  const startTime = performance.now();

  const nodes = targetNodes || graph.nodes;
  const similarities = new Map<string, Map<string, number>>();

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    adjacency.set(node, new Set());
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  // Calculate pairwise similarities
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    const simMap = new Map<string, number>();

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;

      const nodeB = nodes[j];
      const neighborsA = adjacency.get(nodeA) || new Set();
      const neighborsB = adjacency.get(nodeB) || new Set();

      // Cosine similarity
      let intersection = 0;
      for (const neighbor of neighborsA) {
        if (neighborsB.has(neighbor)) {
          intersection++;
        }
      }

      const denominator = Math.sqrt(neighborsA.size * neighborsB.size);
      const similarity = denominator > 0 ? intersection / denominator : 0;

      if (similarity > 0) {
        simMap.set(nodeB, similarity);
      }
    }

    similarities.set(nodeA, simMap);
  }

  const executionTime = performance.now() - startTime;

  return {
    similarities,
    executionTime,
    method: 'cosine',
  };
}

/**
 * Finds nodes most similar to a given node
 */
export function findSimilarNodes(
  nodeId: string,
  similarityResult: SimilarityResult,
  k: number = 10,
): Array<{ node: string; similarity: number }> {
  const similarities = similarityResult.similarities.get(nodeId);
  if (!similarities) {
    return [];
  }

  return Array.from(similarities.entries())
    .map(([node, similarity]) => ({ node, similarity }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Calculates structural equivalence between nodes
 * Nodes are structurally equivalent if they have the same neighbors
 */
export function calculateStructuralEquivalence(
  graph: GraphData,
): Map<string, Map<string, number>> {
  const equivalence = new Map<string, Map<string, number>>();

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    adjacency.set(node, new Set());
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  // Calculate equivalence
  for (const nodeA of graph.nodes) {
    const eqMap = new Map<string, number>();

    for (const nodeB of graph.nodes) {
      if (nodeA === nodeB) continue;

      const neighborsA = adjacency.get(nodeA) || new Set();
      const neighborsB = adjacency.get(nodeB) || new Set();

      // Calculate overlap
      let same = 0;
      let different = 0;

      const allNeighbors = new Set([...neighborsA, ...neighborsB]);
      for (const neighbor of allNeighbors) {
        const inA = neighborsA.has(neighbor);
        const inB = neighborsB.has(neighbor);

        if (inA && inB) {
          same++;
        } else {
          different++;
        }
      }

      const score = allNeighbors.size > 0 ? same / allNeighbors.size : 0;
      eqMap.set(nodeB, score);
    }

    equivalence.set(nodeA, eqMap);
  }

  return equivalence;
}

/**
 * Identifies role equivalence - nodes with similar structural positions
 * even if they don't share neighbors
 */
export function identifyRoleEquivalence(
  graph: GraphData,
  features?: Array<'degree' | 'clustering' | 'betweenness'>,
): Map<string, Map<string, number>> {
  const selectedFeatures = features || ['degree', 'clustering'];

  // Extract structural features
  const nodeFeatures = new Map<string, number[]>();

  const adjacency = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    adjacency.set(node, new Set());
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  // Calculate features
  for (const node of graph.nodes) {
    const features: number[] = [];
    const neighbors = adjacency.get(node) || new Set();

    if (selectedFeatures.includes('degree')) {
      features.push(neighbors.size);
    }

    if (selectedFeatures.includes('clustering')) {
      // Local clustering coefficient
      let triangles = 0;
      let possibleTriangles = 0;

      const neighborList = Array.from(neighbors);
      for (let i = 0; i < neighborList.length; i++) {
        for (let j = i + 1; j < neighborList.length; j++) {
          possibleTriangles++;
          const neighborI = adjacency.get(neighborList[i]) || new Set();
          if (neighborI.has(neighborList[j])) {
            triangles++;
          }
        }
      }

      const clustering = possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      features.push(clustering);
    }

    nodeFeatures.set(node, features);
  }

  // Normalize features
  const numFeatures = nodeFeatures.values().next().value?.length || 0;
  const mins = new Array(numFeatures).fill(Infinity);
  const maxs = new Array(numFeatures).fill(-Infinity);

  for (const features of nodeFeatures.values()) {
    features.forEach((value, idx) => {
      mins[idx] = Math.min(mins[idx], value);
      maxs[idx] = Math.max(maxs[idx], value);
    });
  }

  for (const [node, features] of nodeFeatures) {
    const normalized = features.map((value, idx) => {
      const range = maxs[idx] - mins[idx];
      return range > 0 ? (value - mins[idx]) / range : 0;
    });
    nodeFeatures.set(node, normalized);
  }

  // Calculate Euclidean distance
  const roleEquivalence = new Map<string, Map<string, number>>();

  for (const nodeA of graph.nodes) {
    const eqMap = new Map<string, number>();
    const featuresA = nodeFeatures.get(nodeA) || [];

    for (const nodeB of graph.nodes) {
      if (nodeA === nodeB) continue;

      const featuresB = nodeFeatures.get(nodeB) || [];
      let distanceSquared = 0;

      for (let i = 0; i < featuresA.length; i++) {
        distanceSquared += Math.pow(featuresA[i] - featuresB[i], 2);
      }

      // Convert distance to similarity (1 / (1 + distance))
      const similarity = 1 / (1 + Math.sqrt(distanceSquared));
      eqMap.set(nodeB, similarity);
    }

    roleEquivalence.set(nodeA, eqMap);
  }

  return roleEquivalence;
}
