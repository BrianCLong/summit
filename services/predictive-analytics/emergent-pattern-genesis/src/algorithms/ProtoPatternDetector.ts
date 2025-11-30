/**
 * Proto-Pattern Detector
 * Identifies emerging patterns through weak signal analysis
 */

import { ProtoPatternModel, WeakSignal } from '../models/ProtoPattern.js';

export interface PatternTemplate {
  id: string;
  signature: Record<string, any>;
  requiredFeatures: string[];
  optionalFeatures: string[];
  minCompleteness: number;
}

export interface GraphSnapshot {
  nodes: any[];
  edges: any[];
  timestamp: Date;
}

export interface DetectionConfig {
  sensitivity: number; // 0-1, lower = more sensitive
  minCompleteness: number;
  temporalWindow: number; // days
  maxResults: number;
}

export class ProtoPatternDetector {
  private patternLibrary: Map<string, PatternTemplate>;
  private detectionHistory: Map<string, Date>;

  constructor(patternLibrary: PatternTemplate[] = []) {
    this.patternLibrary = new Map(
      patternLibrary.map((p) => [p.id, p])
    );
    this.detectionHistory = new Map();
  }

  /**
   * Detect proto-patterns in graph snapshot
   */
  async detectProtoPatterns(
    graph: GraphSnapshot,
    config: DetectionConfig
  ): Promise<ProtoPatternModel[]> {
    const protoPatterns: ProtoPatternModel[] = [];

    // Scan graph for each pattern template
    for (const [patternId, template] of this.patternLibrary) {
      const candidates = await this.scanForPattern(
        graph,
        template,
        config
      );

      for (const candidate of candidates) {
        // Check temporal coherence
        if (await this.checkTemporalCoherence(candidate, config)) {
          protoPatterns.push(candidate);
        }
      }
    }

    // Deduplicate and rank
    const deduplicated = this.deduplicate(protoPatterns);
    const ranked = this.rankByConfidence(deduplicated);

    return ranked.slice(0, config.maxResults);
  }

  /**
   * Scan graph for a specific pattern template
   */
  private async scanForPattern(
    graph: GraphSnapshot,
    template: PatternTemplate,
    config: DetectionConfig
  ): Promise<ProtoPatternModel[]> {
    const candidates: ProtoPatternModel[] = [];

    // Extract subgraphs
    const subgraphs = this.extractSubgraphs(graph, template);

    for (const subgraph of subgraphs) {
      // Compute features
      const features = this.extractFeatures(subgraph);

      // Compare with template
      const similarity = this.computeSimilarity(
        features,
        template.signature
      );

      if (similarity >= config.sensitivity) {
        // Extract weak signals
        const weakSignals = this.extractWeakSignals(subgraph, template);

        // Calculate completeness
        const completeness = this.calculateCompleteness(
          features,
          template
        );

        if (completeness >= config.minCompleteness) {
          const protoPattern = new ProtoPatternModel({
            patternId: template.id,
            confidence: similarity,
            completeness: completeness,
            detectedAt: new Date(),
            partialMotif: {
              features: features,
              subgraph: this.serializeSubgraph(subgraph),
            },
            weakSignals: weakSignals,
            expectedPattern: template.signature,
            status: 'detected',
          });

          candidates.push(protoPattern);
        }
      }
    }

    return candidates;
  }

  /**
   * Extract subgraphs from graph
   */
  private extractSubgraphs(
    graph: GraphSnapshot,
    template: PatternTemplate
  ): any[] {
    const subgraphs: any[] = [];
    const visited = new Set<string>();

    // Use BFS to extract connected subgraphs
    for (const node of graph.nodes) {
      if (visited.has(node.id)) {
        continue;
      }

      const subgraph = this.bfsSubgraph(
        graph,
        node,
        visited,
        10 // max depth
      );

      if (subgraph.nodes.length >= 2) {
        subgraphs.push(subgraph);
      }
    }

    return subgraphs;
  }

  /**
   * BFS to extract connected subgraph
   */
  private bfsSubgraph(
    graph: GraphSnapshot,
    startNode: any,
    visited: Set<string>,
    maxDepth: number
  ): any {
    const subgraphNodes: any[] = [];
    const subgraphEdges: any[] = [];
    const queue: { node: any; depth: number }[] = [
      { node: startNode, depth: 0 },
    ];

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;

      if (visited.has(node.id) || depth > maxDepth) {
        continue;
      }

      visited.add(node.id);
      subgraphNodes.push(node);

      // Find connected edges
      const connectedEdges = graph.edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );

      for (const edge of connectedEdges) {
        subgraphEdges.push(edge);

        // Add neighbor to queue
        const neighborId =
          edge.source === node.id ? edge.target : edge.source;
        const neighbor = graph.nodes.find((n) => n.id === neighborId);

        if (neighbor && !visited.has(neighbor.id)) {
          queue.push({ node: neighbor, depth: depth + 1 });
        }
      }
    }

    return { nodes: subgraphNodes, edges: subgraphEdges };
  }

  /**
   * Extract features from subgraph
   */
  private extractFeatures(subgraph: any): Record<string, any> {
    return {
      nodeCount: subgraph.nodes.length,
      edgeCount: subgraph.edges.length,
      density:
        subgraph.nodes.length > 1
          ? (2 * subgraph.edges.length) /
            (subgraph.nodes.length * (subgraph.nodes.length - 1))
          : 0,
      nodeTypes: [...new Set(subgraph.nodes.map((n: any) => n.type))],
      edgeTypes: [...new Set(subgraph.edges.map((e: any) => e.type))],
      avgDegree:
        subgraph.nodes.length > 0
          ? (2 * subgraph.edges.length) / subgraph.nodes.length
          : 0,
      hasHub: subgraph.nodes.some((n: any) => this.getNodeDegree(n, subgraph) > 3),
    };
  }

  /**
   * Get node degree in subgraph
   */
  private getNodeDegree(node: any, subgraph: any): number {
    return subgraph.edges.filter(
      (e: any) => e.source === node.id || e.target === node.id
    ).length;
  }

  /**
   * Compute similarity between features and template
   */
  private computeSimilarity(
    features: Record<string, any>,
    templateSignature: Record<string, any>
  ): number {
    let matchScore = 0;
    let totalWeight = 0;

    // Compare each feature
    for (const [key, templateValue] of Object.entries(templateSignature)) {
      const weight = templateValue.weight || 1;
      totalWeight += weight;

      if (features[key] !== undefined) {
        const similarity = this.compareFeature(
          features[key],
          templateValue.value,
          templateValue.comparator || 'exact'
        );
        matchScore += similarity * weight;
      }
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  /**
   * Compare individual feature
   */
  private compareFeature(
    actual: any,
    expected: any,
    comparator: string
  ): number {
    switch (comparator) {
      case 'exact':
        return actual === expected ? 1 : 0;

      case 'range':
        return actual >= expected.min && actual <= expected.max ? 1 : 0;

      case 'contains':
        return Array.isArray(actual) && Array.isArray(expected)
          ? expected.filter((e: any) => actual.includes(e)).length /
              expected.length
          : 0;

      case 'threshold':
        return actual >= expected ? 1 : actual / expected;

      default:
        return 0;
    }
  }

  /**
   * Calculate completeness
   */
  private calculateCompleteness(
    features: Record<string, any>,
    template: PatternTemplate
  ): number {
    const allFeatures = [
      ...template.requiredFeatures,
      ...template.optionalFeatures,
    ];
    const presentFeatures = allFeatures.filter(
      (f) => features[f] !== undefined
    );

    return allFeatures.length > 0
      ? presentFeatures.length / allFeatures.length
      : 0;
  }

  /**
   * Extract weak signals from subgraph
   */
  private extractWeakSignals(
    subgraph: any,
    template: PatternTemplate
  ): WeakSignal[] {
    const signals: WeakSignal[] = [];

    // Node-based signals
    for (const node of subgraph.nodes) {
      if (this.isWeakSignal(node, template)) {
        signals.push({
          id: `signal_${node.id}`,
          type: 'node',
          strength: this.calculateSignalStrength(node, template),
          location: { nodeId: node.id },
          timestamp: new Date(node.timestamp || Date.now()),
          metadata: { nodeType: node.type },
        });
      }
    }

    // Edge-based signals
    for (const edge of subgraph.edges) {
      if (this.isWeakSignal(edge, template)) {
        signals.push({
          id: `signal_${edge.id}`,
          type: 'edge',
          strength: this.calculateSignalStrength(edge, template),
          location: { edgeId: edge.id, source: edge.source, target: edge.target },
          timestamp: new Date(edge.timestamp || Date.now()),
          metadata: { edgeType: edge.type },
        });
      }
    }

    return signals;
  }

  /**
   * Check if element is a weak signal
   */
  private isWeakSignal(element: any, template: PatternTemplate): boolean {
    // Element is a weak signal if it partially matches template
    return element.confidence && element.confidence < 0.8;
  }

  /**
   * Calculate signal strength
   */
  private calculateSignalStrength(
    element: any,
    template: PatternTemplate
  ): number {
    return element.confidence || 0.5;
  }

  /**
   * Check temporal coherence
   */
  private async checkTemporalCoherence(
    protoPattern: ProtoPatternModel,
    config: DetectionConfig
  ): Promise<boolean> {
    // Check if signals show consistent growth over time
    if (protoPattern.weakSignals.length < 2) {
      return false;
    }

    const sorted = [...protoPattern.weakSignals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Check if within temporal window
    const timeSpan =
      (sorted[sorted.length - 1].timestamp.getTime() -
        sorted[0].timestamp.getTime()) /
      (1000 * 60 * 60 * 24);

    if (timeSpan > config.temporalWindow) {
      return false;
    }

    // Check for increasing trend
    let increasingCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].strength >= sorted[i - 1].strength) {
        increasingCount++;
      }
    }

    return increasingCount / (sorted.length - 1) >= 0.6;
  }

  /**
   * Deduplicate proto-patterns
   */
  private deduplicate(
    protoPatterns: ProtoPatternModel[]
  ): ProtoPatternModel[] {
    const unique = new Map<string, ProtoPatternModel>();

    for (const pattern of protoPatterns) {
      const key = this.generateDeduplicationKey(pattern);

      if (!unique.has(key) || pattern.confidence > unique.get(key)!.confidence) {
        unique.set(key, pattern);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Generate deduplication key
   */
  private generateDeduplicationKey(pattern: ProtoPatternModel): string {
    return `${pattern.patternId}_${JSON.stringify(pattern.partialMotif.features)}`;
  }

  /**
   * Rank proto-patterns by confidence
   */
  private rankByConfidence(
    protoPatterns: ProtoPatternModel[]
  ): ProtoPatternModel[] {
    return protoPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Serialize subgraph
   */
  private serializeSubgraph(subgraph: any): any {
    return {
      nodes: subgraph.nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        label: n.label,
      })),
      edges: subgraph.edges.map((e: any) => ({
        id: e.id,
        type: e.type,
        source: e.source,
        target: e.target,
      })),
    };
  }

  /**
   * Add pattern template to library
   */
  addPatternTemplate(template: PatternTemplate): void {
    this.patternLibrary.set(template.id, template);
  }

  /**
   * Remove pattern template from library
   */
  removePatternTemplate(patternId: string): void {
    this.patternLibrary.delete(patternId);
  }
}
