/**
 * Link prediction algorithms for network analysis
 */

import type { Graph, LinkPrediction } from '@intelgraph/network-analysis';

export class LinkPredictor {
  private graph: Graph;
  private adjList: Map<string, Set<string>>;

  constructor(graph: Graph) {
    this.graph = graph;
    this.adjList = this.buildAdjacencyList();
  }

  /**
   * Predict links using multiple methods
   */
  predictLinks(topK = 100): Map<string, LinkPrediction[]> {
    const predictions = new Map<string, LinkPrediction[]>();

    predictions.set('common_neighbors', this.commonNeighbors(topK));
    predictions.set('adamic_adar', this.adamicAdar(topK));
    predictions.set('jaccard', this.jaccardCoefficient(topK));
    predictions.set('preferential_attachment', this.preferentialAttachment(topK));
    predictions.set('resource_allocation', this.resourceAllocation(topK));

    return predictions;
  }

  /**
   * Common Neighbors score
   */
  commonNeighbors(topK = 100): LinkPrediction[] {
    const candidates: LinkPrediction[] = [];

    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const sourceId = nodeIds[i];
        const targetId = nodeIds[j];

        // Skip if edge already exists
        if (this.edgeExists(sourceId, targetId)) continue;

        const neighbors1 = this.adjList.get(sourceId) || new Set();
        const neighbors2 = this.adjList.get(targetId) || new Set();

        const commonCount = this.countCommonElements(neighbors1, neighbors2);

        if (commonCount > 0) {
          candidates.push({
            sourceId,
            targetId,
            score: commonCount,
            method: 'common_neighbors'
          });
        }
      }
    }

    return this.sortAndTrim(candidates, topK);
  }

  /**
   * Adamic-Adar index
   */
  adamicAdar(topK = 100): LinkPrediction[] {
    const candidates: LinkPrediction[] = [];
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const sourceId = nodeIds[i];
        const targetId = nodeIds[j];

        if (this.edgeExists(sourceId, targetId)) continue;

        const neighbors1 = this.adjList.get(sourceId) || new Set();
        const neighbors2 = this.adjList.get(targetId) || new Set();

        let score = 0;
        neighbors1.forEach(neighbor => {
          if (neighbors2.has(neighbor)) {
            const neighborDegree = (this.adjList.get(neighbor) || new Set()).size;
            if (neighborDegree > 1) {
              score += 1 / Math.log(neighborDegree);
            }
          }
        });

        if (score > 0) {
          candidates.push({
            sourceId,
            targetId,
            score,
            method: 'adamic_adar'
          });
        }
      }
    }

    return this.sortAndTrim(candidates, topK);
  }

  /**
   * Jaccard coefficient
   */
  jaccardCoefficient(topK = 100): LinkPrediction[] {
    const candidates: LinkPrediction[] = [];
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const sourceId = nodeIds[i];
        const targetId = nodeIds[j];

        if (this.edgeExists(sourceId, targetId)) continue;

        const neighbors1 = this.adjList.get(sourceId) || new Set();
        const neighbors2 = this.adjList.get(targetId) || new Set();

        const commonCount = this.countCommonElements(neighbors1, neighbors2);
        const unionSize = new Set([...neighbors1, ...neighbors2]).size;

        const score = unionSize > 0 ? commonCount / unionSize : 0;

        if (score > 0) {
          candidates.push({
            sourceId,
            targetId,
            score,
            method: 'jaccard'
          });
        }
      }
    }

    return this.sortAndTrim(candidates, topK);
  }

  /**
   * Preferential Attachment
   */
  preferentialAttachment(topK = 100): LinkPrediction[] {
    const candidates: LinkPrediction[] = [];
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const sourceId = nodeIds[i];
        const targetId = nodeIds[j];

        if (this.edgeExists(sourceId, targetId)) continue;

        const degree1 = (this.adjList.get(sourceId) || new Set()).size;
        const degree2 = (this.adjList.get(targetId) || new Set()).size;

        const score = degree1 * degree2;

        candidates.push({
          sourceId,
          targetId,
          score,
          method: 'preferential_attachment'
        });
      }
    }

    return this.sortAndTrim(candidates, topK);
  }

  /**
   * Resource Allocation index
   */
  resourceAllocation(topK = 100): LinkPrediction[] {
    const candidates: LinkPrediction[] = [];
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const sourceId = nodeIds[i];
        const targetId = nodeIds[j];

        if (this.edgeExists(sourceId, targetId)) continue;

        const neighbors1 = this.adjList.get(sourceId) || new Set();
        const neighbors2 = this.adjList.get(targetId) || new Set();

        let score = 0;
        neighbors1.forEach(neighbor => {
          if (neighbors2.has(neighbor)) {
            const neighborDegree = (this.adjList.get(neighbor) || new Set()).size;
            if (neighborDegree > 0) {
              score += 1 / neighborDegree;
            }
          }
        });

        if (score > 0) {
          candidates.push({
            sourceId,
            targetId,
            score,
            method: 'resource_allocation'
          });
        }
      }
    }

    return this.sortAndTrim(candidates, topK);
  }

  /**
   * Temporal link prediction based on historical patterns
   */
  temporalPrediction(
    historicalSnapshots: Graph[],
    topK = 100
  ): LinkPrediction[] {
    // Calculate link formation rate
    const linkFormationRates = new Map<string, number>();

    for (let i = 0; i < historicalSnapshots.length - 1; i++) {
      const current = historicalSnapshots[i];
      const next = historicalSnapshots[i + 1];

      // Find new links
      const currentEdges = new Set(
        current.edges.map(e => `${e.source}-${e.target}`)
      );
      const nextEdges = new Set(
        next.edges.map(e => `${e.source}-${e.target}`)
      );

      nextEdges.forEach(edge => {
        if (!currentEdges.has(edge)) {
          linkFormationRates.set(edge, (linkFormationRates.get(edge) || 0) + 1);
        }
      });
    }

    // Convert to predictions
    const predictions: LinkPrediction[] = [];

    linkFormationRates.forEach((rate, edge) => {
      const [sourceId, targetId] = edge.split('-');
      predictions.push({
        sourceId,
        targetId,
        score: rate / (historicalSnapshots.length - 1),
        method: 'temporal'
      });
    });

    return this.sortAndTrim(predictions, topK);
  }

  /**
   * Ensemble prediction combining multiple methods
   */
  ensemblePrediction(topK = 100, weights?: Map<string, number>): LinkPrediction[] {
    const defaultWeights = new Map([
      ['common_neighbors', 0.2],
      ['adamic_adar', 0.25],
      ['jaccard', 0.2],
      ['preferential_attachment', 0.15],
      ['resource_allocation', 0.2]
    ]);

    const methodWeights = weights || defaultWeights;
    const allPredictions = this.predictLinks(topK * 10);

    // Aggregate scores
    const aggregatedScores = new Map<string, { score: number; count: number }>();

    allPredictions.forEach((predictions, method) => {
      const weight = methodWeights.get(method) || 0;

      predictions.forEach(pred => {
        const key = `${pred.sourceId}-${pred.targetId}`;
        const current = aggregatedScores.get(key) || { score: 0, count: 0 };

        aggregatedScores.set(key, {
          score: current.score + pred.score * weight,
          count: current.count + 1
        });
      });
    });

    // Convert to predictions
    const ensemblePredictions: LinkPrediction[] = [];

    aggregatedScores.forEach((data, key) => {
      const [sourceId, targetId] = key.split('-');
      ensemblePredictions.push({
        sourceId,
        targetId,
        score: data.score / data.count,
        method: 'ensemble'
      });
    });

    return this.sortAndTrim(ensemblePredictions, topK);
  }

  /**
   * Build adjacency list
   */
  private buildAdjacencyList(): Map<string, Set<string>> {
    const adjList = new Map<string, Set<string>>();

    this.graph.nodes.forEach((_, nodeId) => {
      adjList.set(nodeId, new Set());
    });

    this.graph.edges.forEach(edge => {
      adjList.get(edge.source)?.add(edge.target);
      if (!this.graph.directed) {
        adjList.get(edge.target)?.add(edge.source);
      }
    });

    return adjList;
  }

  /**
   * Check if edge exists
   */
  private edgeExists(source: string, target: string): boolean {
    return this.graph.edges.some(
      edge =>
        (edge.source === source && edge.target === target) ||
        (!this.graph.directed && edge.source === target && edge.target === source)
    );
  }

  /**
   * Count common elements between two sets
   */
  private countCommonElements<T>(set1: Set<T>, set2: Set<T>): number {
    let count = 0;
    set1.forEach(item => {
      if (set2.has(item)) count++;
    });
    return count;
  }

  /**
   * Sort predictions and return top K
   */
  private sortAndTrim(predictions: LinkPrediction[], topK: number): LinkPrediction[] {
    return predictions.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
