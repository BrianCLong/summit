/**
 * Link Prediction Algorithms
 * Common neighbors, Adamic-Adar, Jaccard, Preferential Attachment
 */

import type { GraphStorage, Node } from '@intelgraph/graph-database';

export interface LinkPrediction {
  sourceId: string;
  targetId: string;
  score: number;
  confidence: number;
  method: string;
  explanation?: string;
}

export interface LinkPredictionResult {
  predictions: LinkPrediction[];
  method: string;
  timestamp: number;
}

export class LinkPredictor {
  constructor(private storage: GraphStorage) {}

  /**
   * Common Neighbors algorithm
   * Score based on number of shared neighbors
   */
  commonNeighbors(sourceId: string, targetId: string): number {
    const sourceNeighbors = new Set(
      this.storage.getNeighbors(sourceId, 'both').map(n => n.id)
    );
    const targetNeighbors = new Set(
      this.storage.getNeighbors(targetId, 'both').map(n => n.id)
    );

    const common = Array.from(sourceNeighbors).filter(n => targetNeighbors.has(n));
    return common.length;
  }

  /**
   * Jaccard Coefficient
   * Normalized common neighbors
   */
  jaccardCoefficient(sourceId: string, targetId: string): number {
    const sourceNeighbors = new Set(
      this.storage.getNeighbors(sourceId, 'both').map(n => n.id)
    );
    const targetNeighbors = new Set(
      this.storage.getNeighbors(targetId, 'both').map(n => n.id)
    );

    const intersection = Array.from(sourceNeighbors).filter(n => targetNeighbors.has(n));
    const union = new Set([...sourceNeighbors, ...targetNeighbors]);

    return union.size > 0 ? intersection.length / union.size : 0;
  }

  /**
   * Adamic-Adar Index
   * Weighted common neighbors based on neighbor degree
   */
  adamicAdar(sourceId: string, targetId: string): number {
    const sourceNeighbors = new Set(
      this.storage.getNeighbors(sourceId, 'both').map(n => n.id)
    );
    const targetNeighbors = new Set(
      this.storage.getNeighbors(targetId, 'both').map(n => n.id)
    );

    const common = Array.from(sourceNeighbors).filter(n => targetNeighbors.has(n));

    let score = 0;
    for (const neighborId of common) {
      const degree = this.storage.getDegree(neighborId, 'both');
      if (degree > 1) {
        score += 1 / Math.log(degree);
      }
    }

    return score;
  }

  /**
   * Preferential Attachment
   * Product of node degrees
   */
  preferentialAttachment(sourceId: string, targetId: string): number {
    const sourceDegree = this.storage.getDegree(sourceId, 'both');
    const targetDegree = this.storage.getDegree(targetId, 'both');
    return sourceDegree * targetDegree;
  }

  /**
   * Resource Allocation Index
   * Similar to Adamic-Adar but different weighting
   */
  resourceAllocation(sourceId: string, targetId: string): number {
    const sourceNeighbors = new Set(
      this.storage.getNeighbors(sourceId, 'both').map(n => n.id)
    );
    const targetNeighbors = new Set(
      this.storage.getNeighbors(targetId, 'both').map(n => n.id)
    );

    const common = Array.from(sourceNeighbors).filter(n => targetNeighbors.has(n));

    let score = 0;
    for (const neighborId of common) {
      const degree = this.storage.getDegree(neighborId, 'both');
      if (degree > 0) {
        score += 1 / degree;
      }
    }

    return score;
  }

  /**
   * Katz centrality-based link prediction
   * Considers all paths between nodes with exponential decay
   */
  katzScore(sourceId: string, targetId: string, beta: number = 0.005, maxLength: number = 3): number {
    let score = 0;

    // Find paths up to maxLength
    for (let length = 1; length <= maxLength; length++) {
      const pathCount = this.countPathsOfLength(sourceId, targetId, length);
      score += Math.pow(beta, length) * pathCount;
    }

    return score;
  }

  /**
   * Time-aware link prediction
   * Incorporates temporal information
   */
  timeAwarePrediction(sourceId: string, targetId: string, decayFactor: number = 0.9): number {
    // Get historical interactions
    const sourceEdges = this.storage.getOutgoingEdges(sourceId);
    const targetEdges = this.storage.getIncomingEdges(targetId);

    const now = Date.now();
    let score = 0;

    // Find common interaction patterns
    const sourceTargets = new Set(sourceEdges.map(e => e.targetId));
    const targetSources = new Set(targetEdges.map(e => e.sourceId));

    // Time-decayed common neighbors
    const sourceNeighbors = this.storage.getNeighbors(sourceId, 'both');

    for (const neighbor of sourceNeighbors) {
      const neighborEdges = this.storage.getAllEdges(neighbor.id);
      const targetNeighbors = new Set(
        this.storage.getNeighbors(targetId, 'both').map(n => n.id)
      );

      if (targetNeighbors.has(neighbor.id)) {
        // Calculate time decay
        const maxAge = Math.max(
          ...neighborEdges.map(e => now - e.createdAt)
        );

        const decay = Math.pow(decayFactor, maxAge / (365 * 24 * 60 * 60 * 1000));
        score += decay;
      }
    }

    return score;
  }

  /**
   * Multi-relational link prediction
   * Considers different edge types
   */
  multiRelationalPrediction(
    sourceId: string,
    targetId: string,
    edgeType?: string
  ): Map<string, number> {
    const scores = new Map<string, number>();

    // Get all edge types in the graph
    const stats = this.storage.getStats();
    const edgeTypes = Array.from(stats.typeCounts.keys());

    for (const type of edgeTypes) {
      if (edgeType && type !== edgeType) continue;

      // Calculate type-specific score
      const typeScore = this.calculateTypeSpecificScore(sourceId, targetId, type);
      scores.set(type, typeScore);
    }

    return scores;
  }

  /**
   * Ensemble prediction
   * Combines multiple methods
   */
  ensemblePrediction(sourceId: string, targetId: string): LinkPrediction {
    const methods = [
      { name: 'common_neighbors', weight: 0.2, score: this.commonNeighbors(sourceId, targetId) },
      { name: 'jaccard', weight: 0.2, score: this.jaccardCoefficient(sourceId, targetId) },
      { name: 'adamic_adar', weight: 0.25, score: this.adamicAdar(sourceId, targetId) },
      { name: 'resource_allocation', weight: 0.2, score: this.resourceAllocation(sourceId, targetId) },
      { name: 'katz', weight: 0.15, score: this.katzScore(sourceId, targetId) }
    ];

    // Normalize scores
    const maxScores = {
      common_neighbors: 20,
      jaccard: 1,
      adamic_adar: 10,
      resource_allocation: 5,
      katz: 1
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const method of methods) {
      const normalizedScore = method.score / (maxScores[method.name as keyof typeof maxScores] || 1);
      totalScore += normalizedScore * method.weight;
      totalWeight += method.weight;
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      sourceId,
      targetId,
      score: finalScore,
      confidence: this.calculateConfidence(methods),
      method: 'ensemble',
      explanation: this.generateExplanation(sourceId, targetId, methods)
    };
  }

  /**
   * Predict top K most likely links for a node
   */
  predictLinksForNode(nodeId: string, k: number = 10): LinkPrediction[] {
    const predictions: LinkPrediction[] = [];
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;

    // Get existing neighbors
    const existingNeighbors = new Set(
      [...this.storage.getNeighbors(nodeId, 'out'), ...this.storage.getNeighbors(nodeId, 'in')]
        .map(n => n.id)
    );

    // Calculate scores for non-connected nodes
    for (const node of nodes) {
      if (node.id === nodeId) continue;
      if (existingNeighbors.has(node.id)) continue;

      const prediction = this.ensemblePrediction(nodeId, node.id);
      predictions.push(prediction);
    }

    // Sort by score and return top K
    predictions.sort((a, b) => b.score - a.score);
    return predictions.slice(0, k);
  }

  /**
   * Batch prediction for multiple node pairs
   */
  batchPredict(pairs: Array<[string, string]>): LinkPredictionResult {
    const predictions = pairs.map(([sourceId, targetId]) =>
      this.ensemblePrediction(sourceId, targetId)
    );

    return {
      predictions,
      method: 'ensemble',
      timestamp: Date.now()
    };
  }

  /**
   * Predict missing links in the entire graph
   */
  predictMissingLinks(threshold: number = 0.5, maxPredictions: number = 100): LinkPrediction[] {
    const predictions: LinkPrediction[] = [];
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;

    // Sample node pairs to avoid combinatorial explosion
    const sampleSize = Math.min(100, nodes.length);
    const sampledNodes = this.sampleNodes(nodes, sampleSize);

    for (let i = 0; i < sampledNodes.length; i++) {
      for (let j = i + 1; j < sampledNodes.length; j++) {
        const source = sampledNodes[i];
        const target = sampledNodes[j];

        // Check if edge already exists
        const existingEdge = this.storage.getOutgoingEdges(source.id)
          .some(e => e.targetId === target.id);

        if (!existingEdge) {
          const prediction = this.ensemblePrediction(source.id, target.id);

          if (prediction.score >= threshold) {
            predictions.push(prediction);
          }
        }
      }
    }

    predictions.sort((a, b) => b.score - a.score);
    return predictions.slice(0, maxPredictions);
  }

  // ==================== Helper Methods ====================

  private countPathsOfLength(sourceId: string, targetId: string, length: number): number {
    if (length === 0) {
      return sourceId === targetId ? 1 : 0;
    }

    if (length === 1) {
      const edges = this.storage.getOutgoingEdges(sourceId);
      return edges.filter(e => e.targetId === targetId).length;
    }

    // Use BFS with depth tracking
    let count = 0;
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: sourceId, depth: 0 }];
    const pathCounts = new Map<string, Map<number, number>>();

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (depth === length) {
        if (nodeId === targetId) {
          count++;
        }
        continue;
      }

      const neighbors = this.storage.getNeighbors(nodeId, 'out');
      for (const neighbor of neighbors) {
        queue.push({ nodeId: neighbor.id, depth: depth + 1 });
      }
    }

    return count;
  }

  private calculateTypeSpecificScore(sourceId: string, targetId: string, edgeType: string): number {
    // Filter neighbors by edge type
    const sourceEdges = this.storage.getOutgoingEdges(sourceId)
      .filter(e => e.type === edgeType);
    const targetEdges = this.storage.getIncomingEdges(targetId)
      .filter(e => e.type === edgeType);

    const sourceTargets = new Set(sourceEdges.map(e => e.targetId));
    const targetSources = new Set(targetEdges.map(e => e.sourceId));

    // Common neighbors with same edge type
    const intersection = Array.from(sourceTargets).filter(t => targetSources.has(t));

    return intersection.length;
  }

  private calculateConfidence(methods: Array<{ name: string; score: number }>): number {
    // Confidence based on agreement between methods
    const nonZeroScores = methods.filter(m => m.score > 0);

    if (nonZeroScores.length === 0) return 0;

    return nonZeroScores.length / methods.length;
  }

  private generateExplanation(
    sourceId: string,
    targetId: string,
    methods: Array<{ name: string; score: number }>
  ): string {
    const topMethod = methods.reduce((max, m) => m.score > max.score ? m : max);

    const source = this.storage.getNode(sourceId);
    const target = this.storage.getNode(targetId);

    if (!source || !target) return 'Unable to generate explanation';

    const commonNeighbors = this.commonNeighbors(sourceId, targetId);

    if (commonNeighbors > 0) {
      return `Strong connection predicted based on ${commonNeighbors} common neighbors`;
    }

    return `Predicted using ${topMethod.name} algorithm`;
  }

  private sampleNodes(nodes: Node[], sampleSize: number): Node[] {
    if (nodes.length <= sampleSize) return nodes;

    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, sampleSize);
  }
}
