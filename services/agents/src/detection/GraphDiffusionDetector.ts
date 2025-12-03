/**
 * Graph Diffusion Detector
 *
 * Implements graph-based anomaly detection using diffusion processes.
 * Detects anomalies in graph structure and node properties by analyzing
 * how information propagates through the network.
 *
 * Key techniques:
 * - Random walk-based diffusion scoring
 * - Local neighborhood anomaly detection
 * - Temporal graph evolution tracking
 */

import {
  AnomalyScore,
  GraphNode,
  GraphEdge,
  GraphDiffusionConfig,
  DiffusionState,
  FeatureContribution,
  DetectorState,
} from './types.js';

interface AdjacencyEntry {
  targetId: string;
  weight: number;
  edgeType: string;
}

interface NodeProfile {
  id: string;
  embedding: number[];
  localDensity: number;
  clusteringCoeff: number;
  pageRank: number;
  diffusionAnomaly: number;
}

export class GraphDiffusionDetector {
  private config: GraphDiffusionConfig;
  private state: DetectorState = 'initializing';
  private adjacencyMap: Map<string, AdjacencyEntry[]> = new Map();
  private nodeProfiles: Map<string, NodeProfile> = new Map();
  private isFitted = false;

  // Global statistics for normalization
  private globalMeanDensity = 0;
  private globalStdDensity = 1;
  private globalMeanClustering = 0;
  private globalStdClustering = 1;

  constructor(config: Partial<GraphDiffusionConfig> = {}) {
    this.config = {
      diffusionSteps: config.diffusionSteps ?? 5,
      dampingFactor: config.dampingFactor ?? 0.85,
      convergenceThreshold: config.convergenceThreshold ?? 1e-6,
      neighborhoodSize: config.neighborhoodSize ?? 2,
      useEdgeWeights: config.useEdgeWeights ?? true,
      embeddingDimension: config.embeddingDimension ?? 64,
    };
  }

  /**
   * Build the graph structure from nodes and edges
   */
  async fit(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    this.state = 'initializing';

    // Build adjacency map
    this.adjacencyMap.clear();
    for (const node of nodes) {
      this.adjacencyMap.set(node.id, []);
    }

    for (const edge of edges) {
      const weight = this.config.useEdgeWeights ? edge.weight : 1.0;

      // Add forward edge
      const sourceAdj = this.adjacencyMap.get(edge.sourceId) || [];
      sourceAdj.push({
        targetId: edge.targetId,
        weight,
        edgeType: edge.type,
      });
      this.adjacencyMap.set(edge.sourceId, sourceAdj);

      // Add reverse edge (undirected graph assumption)
      const targetAdj = this.adjacencyMap.get(edge.targetId) || [];
      targetAdj.push({
        targetId: edge.sourceId,
        weight,
        edgeType: edge.type,
      });
      this.adjacencyMap.set(edge.targetId, targetAdj);
    }

    // Compute node profiles
    await this.computeNodeProfiles(nodes);

    // Compute global statistics
    this.computeGlobalStatistics();

    // Compute PageRank-like diffusion scores
    await this.computeDiffusionScores(nodes);

    this.isFitted = true;
    this.state = 'ready';
  }

  private async computeNodeProfiles(nodes: GraphNode[]): Promise<void> {
    this.nodeProfiles.clear();

    for (const node of nodes) {
      const neighbors = this.adjacencyMap.get(node.id) || [];
      const degree = neighbors.length;

      // Compute local density (degree centrality normalized)
      const localDensity = degree / Math.max(nodes.length - 1, 1);

      // Compute clustering coefficient
      const clusteringCoeff = this.computeClusteringCoefficient(
        node.id,
        neighbors,
      );

      // Initialize embedding (will be refined by diffusion)
      const embedding =
        node.embedding ||
        this.initializeEmbedding(node, this.config.embeddingDimension);

      this.nodeProfiles.set(node.id, {
        id: node.id,
        embedding,
        localDensity,
        clusteringCoeff,
        pageRank: 1.0 / nodes.length, // Initial uniform PageRank
        diffusionAnomaly: 0,
      });
    }
  }

  private computeClusteringCoefficient(
    nodeId: string,
    neighbors: AdjacencyEntry[],
  ): number {
    if (neighbors.length < 2) return 0;

    const neighborIds = new Set(neighbors.map((n) => n.targetId));
    let triangles = 0;

    // Count edges between neighbors
    for (const neighbor of neighbors) {
      const neighborAdj = this.adjacencyMap.get(neighbor.targetId) || [];
      for (const secondNeighbor of neighborAdj) {
        if (neighborIds.has(secondNeighbor.targetId)) {
          triangles++;
        }
      }
    }

    // Each triangle is counted twice
    triangles /= 2;

    const possibleTriangles =
      (neighbors.length * (neighbors.length - 1)) / 2;
    return possibleTriangles > 0 ? triangles / possibleTriangles : 0;
  }

  private initializeEmbedding(node: GraphNode, dimension: number): number[] {
    const embedding = new Array(dimension).fill(0);

    // Use node properties to initialize embedding
    const propValues = Object.values(node.properties);
    for (let i = 0; i < dimension; i++) {
      if (i < propValues.length) {
        const val = propValues[i];
        embedding[i] =
          typeof val === 'number'
            ? val
            : typeof val === 'string'
              ? this.hashString(val) / 1000000
              : 0;
      } else {
        // Add structural features
        const structIdx = i - propValues.length;
        switch (structIdx % 3) {
          case 0:
            embedding[i] = node.degree;
            break;
          case 1:
            embedding[i] = node.clusteringCoefficient;
            break;
          case 2:
            embedding[i] = (this.adjacencyMap.get(node.id) || []).length;
            break;
        }
      }
    }

    // Normalize embedding
    const norm = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private computeGlobalStatistics(): void {
    const densities: number[] = [];
    const clusterings: number[] = [];

    for (const profile of this.nodeProfiles.values()) {
      densities.push(profile.localDensity);
      clusterings.push(profile.clusteringCoeff);
    }

    this.globalMeanDensity = this.mean(densities);
    this.globalStdDensity = this.std(densities, this.globalMeanDensity);
    this.globalMeanClustering = this.mean(clusterings);
    this.globalStdClustering = this.std(clusterings, this.globalMeanClustering);
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private std(values: number[], mean: number): number {
    if (values.length === 0) return 1;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance) || 1;
  }

  private async computeDiffusionScores(nodes: GraphNode[]): Promise<void> {
    const numNodes = nodes.length;
    const d = this.config.dampingFactor;
    const threshold = this.config.convergenceThreshold;

    // Initialize PageRank scores
    let scores = new Map<string, number>();
    for (const node of nodes) {
      scores.set(node.id, 1.0 / numNodes);
    }

    // Power iteration
    for (let step = 0; step < this.config.diffusionSteps; step++) {
      const newScores = new Map<string, number>();
      let maxDiff = 0;

      for (const node of nodes) {
        const neighbors = this.adjacencyMap.get(node.id) || [];
        let sum = 0;

        for (const neighbor of neighbors) {
          const neighborDegree =
            (this.adjacencyMap.get(neighbor.targetId) || []).length;
          if (neighborDegree > 0) {
            const neighborScore = scores.get(neighbor.targetId) || 0;
            sum += (neighborScore * neighbor.weight) / neighborDegree;
          }
        }

        const newScore = (1 - d) / numNodes + d * sum;
        newScores.set(node.id, newScore);

        const diff = Math.abs(newScore - (scores.get(node.id) || 0));
        maxDiff = Math.max(maxDiff, diff);
      }

      scores = newScores;

      // Check convergence
      if (maxDiff < threshold) {
        break;
      }
    }

    // Update node profiles with PageRank scores
    for (const [nodeId, score] of scores) {
      const profile = this.nodeProfiles.get(nodeId);
      if (profile) {
        profile.pageRank = score;
      }
    }
  }

  /**
   * Detect anomalies based on graph diffusion patterns
   */
  async detect(nodeIds: string[]): Promise<AnomalyScore[]> {
    if (!this.isFitted) {
      throw new Error('Detector must be fitted before detection');
    }

    this.state = 'detecting';
    const startTime = Date.now();
    const results: AnomalyScore[] = [];

    for (const nodeId of nodeIds) {
      const profile = this.nodeProfiles.get(nodeId);
      if (!profile) {
        continue;
      }

      // Compute diffusion anomaly score
      const diffusionScore = await this.computeDiffusionAnomalyScore(nodeId);

      // Compute structural anomaly score
      const structuralScore = this.computeStructuralAnomalyScore(profile);

      // Compute neighborhood anomaly score
      const neighborScore = this.computeNeighborhoodAnomalyScore(nodeId);

      // Combine scores (weighted average)
      const combinedScore =
        0.4 * diffusionScore + 0.35 * structuralScore + 0.25 * neighborScore;

      // Compute contributing features
      const contributions = this.computeContributions(
        profile,
        diffusionScore,
        structuralScore,
        neighborScore,
      );

      results.push({
        featureId: nodeId,
        score: combinedScore,
        isAnomaly: combinedScore > 0.7,
        detectorType: 'graph_diffusion',
        confidence: this.computeConfidence(combinedScore),
        contributingFeatures: contributions,
        timestamp: new Date(),
      });
    }

    const latencyMs = Date.now() - startTime;
    if (latencyMs > 500) {
      console.warn(
        `[GraphDiffusion] Detection exceeded 500ms: ${latencyMs}ms for ${nodeIds.length} nodes`,
      );
    }

    this.state = 'ready';
    return results;
  }

  private async computeDiffusionAnomalyScore(nodeId: string): Promise<number> {
    const profile = this.nodeProfiles.get(nodeId);
    if (!profile) return 0;

    // Run random walks from this node
    const numWalks = 50;
    const walkLength = this.config.diffusionSteps;
    const visitCounts = new Map<string, number>();

    for (let w = 0; w < numWalks; w++) {
      let currentNode = nodeId;
      for (let step = 0; step < walkLength; step++) {
        const neighbors = this.adjacencyMap.get(currentNode) || [];
        if (neighbors.length === 0) break;

        // Weighted random selection
        const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const neighbor of neighbors) {
          rand -= neighbor.weight;
          if (rand <= 0) {
            currentNode = neighbor.targetId;
            break;
          }
        }
      }

      const count = visitCounts.get(currentNode) || 0;
      visitCounts.set(currentNode, count + 1);
    }

    // Compute return probability (anomalous if very high or very low)
    const returnProb = (visitCounts.get(nodeId) || 0) / numWalks;
    const expectedReturnProb =
      1 / (this.adjacencyMap.get(nodeId) || []).length || 0.5;

    const deviation = Math.abs(returnProb - expectedReturnProb);
    return Math.min(1, deviation * 2);
  }

  private computeStructuralAnomalyScore(profile: NodeProfile): number {
    // Z-score based anomaly detection for structural features
    const densityZ = Math.abs(
      (profile.localDensity - this.globalMeanDensity) / this.globalStdDensity,
    );
    const clusteringZ = Math.abs(
      (profile.clusteringCoeff - this.globalMeanClustering) /
        this.globalStdClustering,
    );

    // Convert to [0, 1] range using sigmoid-like function
    const densityScore = 1 - 1 / (1 + Math.exp(densityZ - 2));
    const clusteringScore = 1 - 1 / (1 + Math.exp(clusteringZ - 2));

    return (densityScore + clusteringScore) / 2;
  }

  private computeNeighborhoodAnomalyScore(nodeId: string): number {
    const profile = this.nodeProfiles.get(nodeId);
    if (!profile) return 0;

    const neighbors = this.adjacencyMap.get(nodeId) || [];
    if (neighbors.length === 0) return 0.5; // Isolated node is suspicious

    // Compare embedding to neighborhood average
    const neighborEmbeddings: number[][] = [];
    for (const neighbor of neighbors) {
      const neighborProfile = this.nodeProfiles.get(neighbor.targetId);
      if (neighborProfile) {
        neighborEmbeddings.push(neighborProfile.embedding);
      }
    }

    if (neighborEmbeddings.length === 0) return 0.5;

    // Compute mean neighbor embedding
    const dim = profile.embedding.length;
    const meanEmbedding = new Array(dim).fill(0);
    for (const emb of neighborEmbeddings) {
      for (let i = 0; i < dim; i++) {
        meanEmbedding[i] += emb[i];
      }
    }
    for (let i = 0; i < dim; i++) {
      meanEmbedding[i] /= neighborEmbeddings.length;
    }

    // Compute cosine distance from mean
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < dim; i++) {
      dotProduct += profile.embedding[i] * meanEmbedding[i];
      normA += profile.embedding[i] * profile.embedding[i];
      normB += meanEmbedding[i] * meanEmbedding[i];
    }

    const cosineSimilarity =
      normA > 0 && normB > 0
        ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
        : 0;

    // Convert to anomaly score (low similarity = high anomaly)
    return 1 - Math.max(0, Math.min(1, (cosineSimilarity + 1) / 2));
  }

  private computeContributions(
    profile: NodeProfile,
    diffusionScore: number,
    structuralScore: number,
    neighborScore: number,
  ): FeatureContribution[] {
    const contributions: FeatureContribution[] = [];

    if (diffusionScore > 0.5) {
      contributions.push({
        featureIndex: 0,
        featureName: 'diffusion_pattern',
        contribution: diffusionScore,
        direction:
          profile.pageRank > this.mean([...this.nodeProfiles.values()].map((p) => p.pageRank))
            ? 'high'
            : 'low',
      });
    }

    if (structuralScore > 0.5) {
      contributions.push({
        featureIndex: 1,
        featureName: 'structural_deviation',
        contribution: structuralScore,
        direction:
          profile.localDensity > this.globalMeanDensity ? 'high' : 'low',
      });
    }

    if (neighborScore > 0.5) {
      contributions.push({
        featureIndex: 2,
        featureName: 'neighborhood_dissimilarity',
        contribution: neighborScore,
        direction: 'neutral',
      });
    }

    return contributions.sort((a, b) => b.contribution - a.contribution);
  }

  private computeConfidence(score: number): number {
    // Higher confidence for scores closer to extremes (0 or 1)
    const distanceFromMiddle = Math.abs(score - 0.5) * 2;
    return 0.5 + distanceFromMiddle * 0.5;
  }

  /**
   * Incrementally add new nodes/edges without full refit
   */
  async addNodes(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    // Add new nodes to adjacency map
    for (const node of nodes) {
      if (!this.adjacencyMap.has(node.id)) {
        this.adjacencyMap.set(node.id, []);
      }
    }

    // Add new edges
    for (const edge of edges) {
      const weight = this.config.useEdgeWeights ? edge.weight : 1.0;

      const sourceAdj = this.adjacencyMap.get(edge.sourceId) || [];
      sourceAdj.push({
        targetId: edge.targetId,
        weight,
        edgeType: edge.type,
      });
      this.adjacencyMap.set(edge.sourceId, sourceAdj);

      const targetAdj = this.adjacencyMap.get(edge.targetId) || [];
      targetAdj.push({
        targetId: edge.sourceId,
        weight,
        edgeType: edge.type,
      });
      this.adjacencyMap.set(edge.targetId, targetAdj);
    }

    // Compute profiles for new nodes only
    await this.computeNodeProfiles(nodes);
  }

  getState(): DetectorState {
    return this.state;
  }

  isTrained(): boolean {
    return this.isFitted;
  }

  getConfig(): GraphDiffusionConfig {
    return { ...this.config };
  }

  getNodeProfile(nodeId: string): NodeProfile | undefined {
    return this.nodeProfiles.get(nodeId);
  }
}
