/**
 * Relationship Pattern Mining
 * Frequent subgraph mining, pattern templates, anomaly detection
 */

import type { GraphStorage, Node, Edge, Path } from '@intelgraph/graph-database';

export interface Pattern {
  id: string;
  nodes: Node[];
  edges: Edge[];
  frequency: number;
  support: number;
}

export interface Motif {
  type: string;
  instances: MotifInstance[];
  count: number;
  significance: number;
}

export interface MotifInstance {
  nodeIds: string[];
  edgeIds: string[];
}

export interface AnomalousRelationship {
  edge: Edge;
  anomalyScore: number;
  reasons: string[];
}

export interface TemporalPattern {
  pattern: Pattern;
  timestamps: number[];
  frequency: Map<string, number>; // time period -> count
}

export class PatternMining {
  constructor(private storage: GraphStorage) {}

  /**
   * Frequent subgraph mining
   * Find subgraphs that occur frequently in the graph
   */
  frequentSubgraphs(minSupport: number = 0.1, maxSize: number = 5): Pattern[] {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const patterns: Pattern[] = [];

    // Start with frequent edge types
    const edgeTypeCounts = new Map<string, number>();
    for (const edge of exported.edges) {
      edgeTypeCounts.set(edge.type, (edgeTypeCounts.get(edge.type) || 0) + 1);
    }

    const totalEdges = exported.edges.length;
    const minCount = Math.ceil(minSupport * totalEdges);

    // Generate 2-node patterns (single edges)
    const frequentEdgeTypes = Array.from(edgeTypeCounts.entries())
      .filter(([_, count]) => count >= minCount)
      .map(([type, _]) => type);

    for (const edgeType of frequentEdgeTypes) {
      const edges = this.storage.getEdgesByType(edgeType);

      if (edges.length >= minCount) {
        const sampleEdge = edges[0];
        const sourceNode = this.storage.getNode(sampleEdge.sourceId);
        const targetNode = this.storage.getNode(sampleEdge.targetId);

        if (sourceNode && targetNode) {
          patterns.push({
            id: `pattern_${edgeType}`,
            nodes: [sourceNode, targetNode],
            edges: [sampleEdge],
            frequency: edges.length,
            support: edges.length / totalEdges
          });
        }
      }
    }

    // Extend patterns to larger subgraphs
    // This is a simplified implementation
    // Full gSpan or FSG algorithm would be needed for production

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Pattern template matching
   * Find instances of a specific pattern template
   */
  matchPattern(template: PatternTemplate): Pattern[] {
    const matches: Pattern[] = [];

    // Start from nodes matching the first node in template
    const exported = this.storage.exportGraph();

    for (const node of exported.nodes) {
      if (this.nodeMatchesTemplate(node, template.nodes[0])) {
        const match = this.expandPatternMatch(node, template);
        if (match) {
          matches.push(match);
        }
      }
    }

    return matches;
  }

  /**
   * Motif detection
   * Find specific network motifs (triangles, stars, chains, etc.)
   */
  detectMotifs(): Motif[] {
    const motifs: Motif[] = [];

    // Triangle motif
    motifs.push(this.detectTriangleMotif());

    // Star motif (hub with spokes)
    motifs.push(this.detectStarMotif(3)); // 3-star

    // Chain motif
    motifs.push(this.detectChainMotif(3)); // 3-chain

    // Bipartite motif
    motifs.push(this.detectBipartiteMotif());

    return motifs.filter(m => m.count > 0);
  }

  /**
   * Anomalous relationship identification
   * Detect relationships that don't fit expected patterns
   */
  detectAnomalousRelationships(threshold: number = 0.7): AnomalousRelationship[] {
    const anomalies: AnomalousRelationship[] = [];
    const exported = this.storage.exportGraph();

    for (const edge of exported.edges) {
      const anomalyScore = this.calculateAnomalyScore(edge);

      if (anomalyScore >= threshold) {
        const reasons = this.identifyAnomalyReasons(edge, anomalyScore);
        anomalies.push({ edge, anomalyScore, reasons });
      }
    }

    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  /**
   * Temporal relationship patterns
   * Identify patterns that change over time
   */
  temporalPatterns(timeWindow: number = 86400000): TemporalPattern[] {
    const exported = this.storage.exportGraph();
    const patterns: TemporalPattern[] = [];

    // Group edges by time windows
    const timeWindows = new Map<number, Edge[]>();

    for (const edge of exported.edges) {
      const windowStart = Math.floor(edge.createdAt / timeWindow) * timeWindow;

      if (!timeWindows.has(windowStart)) {
        timeWindows.set(windowStart, []);
      }
      timeWindows.get(windowStart)!.push(edge);
    }

    // Analyze patterns in each time window
    const patternFrequency = new Map<string, Map<string, number>>();

    for (const [windowStart, edges] of timeWindows) {
      const windowPatterns = this.extractPatternsFromEdges(edges);

      for (const pattern of windowPatterns) {
        if (!patternFrequency.has(pattern.id)) {
          patternFrequency.set(pattern.id, new Map());
        }

        const freq = patternFrequency.get(pattern.id)!;
        const windowKey = new Date(windowStart).toISOString();
        freq.set(windowKey, pattern.frequency);
      }
    }

    // Convert to temporal patterns
    for (const [patternId, frequency] of patternFrequency) {
      // Create a representative pattern
      const timestamps = Array.from(frequency.keys()).map(k => new Date(k).getTime());

      patterns.push({
        pattern: {
          id: patternId,
          nodes: [],
          edges: [],
          frequency: Array.from(frequency.values()).reduce((a, b) => a + b, 0),
          support: 0
        },
        timestamps,
        frequency
      });
    }

    return patterns;
  }

  /**
   * Multi-hop relationship inference
   * Infer potential relationships through intermediate connections
   */
  inferMultiHopRelationships(
    sourceId: string,
    targetId: string,
    maxHops: number = 3
  ): Path[] {
    const paths: Path[] = [];
    const visited = new Set<string>();

    this.findPathsDFS(sourceId, targetId, maxHops, [], paths, visited);

    return paths.sort((a, b) => a.length - b.length);
  }

  /**
   * Relationship strength scoring
   * Calculate the strength of a relationship based on multiple factors
   */
  calculateRelationshipStrength(edgeId: string): number {
    const edge = this.storage.getEdge(edgeId);
    if (!edge) return 0;

    let strength = 0;

    // Factor 1: Edge weight
    strength += edge.weight * 0.3;

    // Factor 2: Common neighbors (Jaccard similarity)
    const source = this.storage.getNode(edge.sourceId);
    const target = this.storage.getNode(edge.targetId);

    if (source && target) {
      const sourceNeighbors = new Set(
        this.storage.getNeighbors(source.id, 'both').map(n => n.id)
      );
      const targetNeighbors = new Set(
        this.storage.getNeighbors(target.id, 'both').map(n => n.id)
      );

      const intersection = new Set(
        Array.from(sourceNeighbors).filter(n => targetNeighbors.has(n))
      );
      const union = new Set([...sourceNeighbors, ...targetNeighbors]);

      const jaccard = union.size > 0 ? intersection.size / union.size : 0;
      strength += jaccard * 0.3;
    }

    // Factor 3: Temporal recency
    const age = Date.now() - edge.createdAt;
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    const recency = Math.max(0, 1 - age / maxAge);
    strength += recency * 0.2;

    // Factor 4: Update frequency
    const updates = edge.version - 1;
    const updateScore = Math.min(1, updates / 10);
    strength += updateScore * 0.2;

    return Math.min(1, strength);
  }

  /**
   * Path significance analysis
   * Determine how significant a path is in the overall graph
   */
  analyzePathSignificance(path: Path): number {
    if (path.length === 0) return 0;

    let significance = 0;

    // Factor 1: Path rarity (inverse of common paths)
    const pathTypes = path.edges.map(e => e.type).join('->');
    const similarPaths = this.findSimilarPaths(pathTypes);
    const rarity = 1 / (1 + similarPaths.length);
    significance += rarity * 0.4;

    // Factor 2: Node importance (average centrality)
    // This would require centrality calculation
    significance += 0.3;

    // Factor 3: Path efficiency (ratio of actual to possible distance)
    const actualDistance = path.weight;
    const minPossibleDistance = path.length;
    const efficiency = minPossibleDistance / (actualDistance || 1);
    significance += Math.min(1, efficiency) * 0.3;

    return significance;
  }

  // ==================== Helper Methods ====================

  private detectTriangleMotif(): Motif {
    const instances: MotifInstance[] = [];
    const exported = this.storage.exportGraph();

    for (const node1 of exported.nodes) {
      const neighbors1 = this.storage.getNeighbors(node1.id, 'out');

      for (const node2 of neighbors1) {
        const neighbors2 = this.storage.getNeighbors(node2.id, 'out');

        for (const node3 of neighbors2) {
          // Check if node3 connects back to node1
          const neighbors3 = this.storage.getNeighbors(node3.id, 'out');

          if (neighbors3.some(n => n.id === node1.id)) {
            instances.push({
              nodeIds: [node1.id, node2.id, node3.id],
              edgeIds: [] // Would need to collect edge IDs
            });
          }
        }
      }
    }

    return {
      type: 'triangle',
      instances: instances.slice(0, 100), // Limit for performance
      count: instances.length,
      significance: this.calculateMotifSignificance('triangle', instances.length)
    };
  }

  private detectStarMotif(k: number): Motif {
    const instances: MotifInstance[] = [];
    const exported = this.storage.exportGraph();

    for (const node of exported.nodes) {
      const neighbors = this.storage.getNeighbors(node.id, 'out');

      if (neighbors.length >= k) {
        instances.push({
          nodeIds: [node.id, ...neighbors.slice(0, k).map(n => n.id)],
          edgeIds: []
        });
      }
    }

    return {
      type: `star_${k}`,
      instances,
      count: instances.length,
      significance: this.calculateMotifSignificance(`star_${k}`, instances.length)
    };
  }

  private detectChainMotif(length: number): Motif {
    const instances: MotifInstance[] = [];
    // Implementation would use DFS to find chains of specific length
    return {
      type: `chain_${length}`,
      instances,
      count: 0,
      significance: 0
    };
  }

  private detectBipartiteMotif(): Motif {
    const instances: MotifInstance[] = [];
    // Implementation would identify bipartite subgraphs
    return {
      type: 'bipartite',
      instances,
      count: 0,
      significance: 0
    };
  }

  private calculateMotifSignificance(type: string, count: number): number {
    // Compare to random graph expectation
    const stats = this.storage.getStats();
    const totalNodes = stats.nodeCount;
    const totalEdges = stats.edgeCount;

    if (totalNodes === 0) return 0;

    // Expected count in random graph (simplified)
    let expectedCount = 0;
    const edgeProbability = totalEdges / (totalNodes * (totalNodes - 1));

    if (type === 'triangle') {
      expectedCount = (totalNodes * (totalNodes - 1) * (totalNodes - 2) / 6) *
        Math.pow(edgeProbability, 3);
    }

    const significance = expectedCount > 0 ? count / expectedCount : 0;
    return Math.min(10, significance); // Cap at 10x
  }

  private calculateAnomalyScore(edge: Edge): number {
    let anomalyScore = 0;

    // Factor 1: Type rarity
    const typeEdges = this.storage.getEdgesByType(edge.type);
    const typeRarity = 1 / (1 + typeEdges.length);
    anomalyScore += typeRarity * 0.4;

    // Factor 2: Weight deviation
    const avgWeight = typeEdges.reduce((sum, e) => sum + e.weight, 0) / typeEdges.length;
    const weightDeviation = Math.abs(edge.weight - avgWeight) / (avgWeight || 1);
    anomalyScore += Math.min(1, weightDeviation) * 0.3;

    // Factor 3: Temporal anomaly
    const recentEdges = typeEdges.filter(e =>
      e.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const temporalRarity = 1 - (recentEdges.length / (typeEdges.length || 1));
    anomalyScore += temporalRarity * 0.3;

    return anomalyScore;
  }

  private identifyAnomalyReasons(edge: Edge, score: number): string[] {
    const reasons: string[] = [];

    if (score > 0.7) {
      reasons.push('Highly unusual relationship type');
    }

    const typeEdges = this.storage.getEdgesByType(edge.type);
    if (typeEdges.length < 5) {
      reasons.push('Rare relationship type in graph');
    }

    const avgWeight = typeEdges.reduce((sum, e) => sum + e.weight, 0) / typeEdges.length;
    if (Math.abs(edge.weight - avgWeight) > avgWeight) {
      reasons.push('Unusual weight for relationship type');
    }

    return reasons;
  }

  private nodeMatchesTemplate(node: Node, template: NodeTemplate): boolean {
    if (template.labels && !template.labels.every(l => node.labels.includes(l))) {
      return false;
    }

    if (template.properties) {
      for (const [key, value] of Object.entries(template.properties)) {
        if (node.properties[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private expandPatternMatch(node: Node, template: PatternTemplate): Pattern | null {
    // Simplified implementation
    return null;
  }

  private extractPatternsFromEdges(edges: Edge[]): Pattern[] {
    // Simplified implementation
    return [];
  }

  private findPathsDFS(
    current: string,
    target: string,
    maxHops: number,
    currentPath: string[],
    paths: Path[],
    visited: Set<string>
  ): void {
    if (currentPath.length >= maxHops) return;
    if (visited.has(current)) return;

    visited.add(current);
    currentPath.push(current);

    if (current === target && currentPath.length > 1) {
      // Found a path
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      for (let i = 0; i < currentPath.length; i++) {
        const node = this.storage.getNode(currentPath[i]);
        if (node) nodes.push(node);

        if (i < currentPath.length - 1) {
          const outgoing = this.storage.getOutgoingEdges(currentPath[i]);
          const edge = outgoing.find(e => e.targetId === currentPath[i + 1]);
          if (edge) edges.push(edge);
        }
      }

      paths.push({
        nodes,
        edges,
        length: edges.length,
        weight: edges.reduce((sum, e) => sum + e.weight, 0)
      });
    }

    const neighbors = this.storage.getNeighbors(current, 'out');
    for (const neighbor of neighbors) {
      this.findPathsDFS(neighbor.id, target, maxHops, [...currentPath], paths, new Set(visited));
    }
  }

  private findSimilarPaths(pathType: string): Path[] {
    // Simplified: would search for paths with similar edge type sequences
    return [];
  }
}

// ==================== Types ====================

interface PatternTemplate {
  nodes: NodeTemplate[];
  edges: EdgeTemplate[];
}

interface NodeTemplate {
  labels?: string[];
  properties?: Record<string, unknown>;
}

interface EdgeTemplate {
  type?: string;
  properties?: Record<string, unknown>;
}
