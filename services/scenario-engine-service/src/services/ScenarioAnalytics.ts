/**
 * Scenario Analytics Service
 *
 * Computes metrics within scenario context:
 * - Graph analytics (centrality, paths, clustering)
 * - Detection metrics
 * - Risk scores
 * - Delta comparisons between scenarios
 */

import {
  type OutcomeMetrics,
  type MetricValue,
  type MetricDelta,
  type MetricType,
  type ScenarioComparison,
  type ScenarioNode,
  type ScenarioEdge,
  generateId,
} from '../types/index.js';
import { SandboxGraph } from './SandboxGraph.js';

export interface AnalyticsConfig {
  topKNodes: number;
  pageRankDampingFactor: number;
  pageRankMaxIterations: number;
  pageRankTolerance: number;
  significanceThreshold: number;
  enableCaching: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  topKNodes: 10,
  pageRankDampingFactor: 0.85,
  pageRankMaxIterations: 100,
  pageRankTolerance: 1e-6,
  significanceThreshold: 0.05,
  enableCaching: true,
};

export class ScenarioAnalytics {
  private sandboxGraph: SandboxGraph;
  private config: AnalyticsConfig;
  private metricsCache: Map<string, MetricValue[]> = new Map();

  constructor(sandboxGraph: SandboxGraph, config: Partial<AnalyticsConfig> = {}) {
    this.sandboxGraph = sandboxGraph;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Full Metrics Computation
  // ============================================================================

  /**
   * Compute all metrics for the scenario
   */
  async computeMetrics(
    baselineMetrics?: OutcomeMetrics,
    requestedMetrics?: MetricType[]
  ): Promise<OutcomeMetrics> {
    const startTime = Date.now();
    const scenarioId = this.sandboxGraph.getScenarioId();

    // Export graph for analysis
    const { nodes, edges } = await this.sandboxGraph.exportGraph();
    const nodeCount = nodes.length;
    const edgeCount = edges.length;

    // Build adjacency for algorithms
    const adjacency = this.buildAdjacency(nodes, edges);

    // Compute metrics
    const metrics: MetricValue[] = [];
    const metricsToCompute = requestedMetrics || [
      'centrality',
      'path_length',
      'clustering',
      'connectivity',
      'risk_score',
    ];

    // Graph structure metrics
    const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    const density = nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

    metrics.push(
      this.createMetric('node_count', 'custom', nodeCount),
      this.createMetric('edge_count', 'custom', edgeCount),
      this.createMetric('avg_degree', 'custom', avgDegree),
      this.createMetric('density', 'custom', density)
    );

    // Connected components
    const components = this.computeConnectedComponents(nodes, adjacency);
    metrics.push(this.createMetric('connected_components', 'connectivity', components.length));

    // Centrality metrics
    let topNodesByPageRank: Array<{ nodeId: string; score: number }> = [];
    let topNodesByBetweenness: Array<{ nodeId: string; score: number }> = [];

    if (metricsToCompute.includes('centrality')) {
      const pageRank = this.computePageRank(nodes, adjacency);
      topNodesByPageRank = this.getTopK(pageRank, this.config.topKNodes);

      const betweenness = this.computeBetweennessCentrality(nodes, adjacency);
      topNodesByBetweenness = this.getTopK(betweenness, this.config.topKNodes);

      const avgPageRank = this.computeAverage(pageRank);
      const avgBetweenness = this.computeAverage(betweenness);

      metrics.push(
        this.createMetric('avg_pagerank', 'centrality', avgPageRank),
        this.createMetric('avg_betweenness', 'centrality', avgBetweenness)
      );
    }

    // Path metrics
    let avgPathLength: number | undefined;
    let diameter: number | undefined;

    if (metricsToCompute.includes('path_length')) {
      const pathMetrics = this.computePathMetrics(nodes, adjacency);
      avgPathLength = pathMetrics.avgPathLength;
      diameter = pathMetrics.diameter;

      if (avgPathLength !== undefined) {
        metrics.push(this.createMetric('avg_path_length', 'path_length', avgPathLength));
      }
      if (diameter !== undefined) {
        metrics.push(this.createMetric('diameter', 'path_length', diameter));
      }
    }

    // Clustering
    if (metricsToCompute.includes('clustering')) {
      const clusteringCoefficient = this.computeClusteringCoefficient(nodes, adjacency);
      metrics.push(this.createMetric('clustering_coefficient', 'clustering', clusteringCoefficient));
    }

    // Risk metrics
    let aggregateRiskScore: number | undefined;
    let riskDistribution: Record<string, number> = {};

    if (metricsToCompute.includes('risk_score')) {
      const riskMetrics = this.computeRiskMetrics(nodes, edges);
      aggregateRiskScore = riskMetrics.aggregateScore;
      riskDistribution = riskMetrics.distribution;

      metrics.push(this.createMetric('aggregate_risk_score', 'risk_score', aggregateRiskScore));
    }

    // Detection metrics
    let detectionCoverage: number | undefined;
    let avgDetectionTime: number | undefined;

    if (metricsToCompute.includes('detection_time') || metricsToCompute.includes('coverage')) {
      const detectionMetrics = this.computeDetectionMetrics(nodes, edges);
      detectionCoverage = detectionMetrics.coverage;
      avgDetectionTime = detectionMetrics.avgDetectionTime;

      if (detectionCoverage !== undefined) {
        metrics.push(this.createMetric('detection_coverage', 'coverage', detectionCoverage));
      }
      if (avgDetectionTime !== undefined) {
        metrics.push(this.createMetric('avg_detection_time', 'detection_time', avgDetectionTime));
      }
    }

    // Resource metrics
    if (metricsToCompute.includes('resource_load')) {
      const resourceMetrics = this.computeResourceMetrics(nodes, edges);
      metrics.push(this.createMetric('resource_load', 'resource_load', resourceMetrics.load));
    }

    // Compute deltas if baseline provided
    const deltas: MetricDelta[] = [];
    if (baselineMetrics) {
      for (const metric of metrics) {
        const baselineMetric = baselineMetrics.metrics.find(m => m.name === metric.name);
        if (baselineMetric) {
          const delta = this.computeDelta(metric, baselineMetric);
          deltas.push(delta);
        }
      }
    }

    const computationTimeMs = Date.now() - startTime;

    // Generate summary
    const summary = this.generateSummary(metrics, deltas, nodeCount, edgeCount);
    const warnings = this.generateWarnings(nodes, edges, metrics);
    const recommendations = this.generateRecommendations(metrics, deltas);

    const outcomeMetrics: OutcomeMetrics = {
      scenarioId,
      computedAt: Date.now(),
      computationTimeMs,
      metrics,
      baselineScenarioId: baselineMetrics?.scenarioId,
      deltas,
      nodeCount,
      edgeCount,
      avgDegree,
      density,
      connectedComponents: components.length,
      topNodesByPageRank,
      topNodesByBetweenness,
      avgPathLength,
      diameter,
      aggregateRiskScore,
      riskDistribution,
      detectionCoverage,
      avgDetectionTime,
      summary,
      warnings,
      recommendations,
    };

    // Cache if enabled
    if (this.config.enableCaching) {
      this.metricsCache.set(scenarioId, metrics);
    }

    return outcomeMetrics;
  }

  // ============================================================================
  // Scenario Comparison
  // ============================================================================

  /**
   * Compare two scenarios and compute differences
   */
  async compareScenarios(
    scenario1Graph: SandboxGraph,
    scenario2Graph: SandboxGraph
  ): Promise<ScenarioComparison> {
    // Compute metrics for both scenarios
    const analytics1 = new ScenarioAnalytics(scenario1Graph, this.config);
    const analytics2 = new ScenarioAnalytics(scenario2Graph, this.config);

    const metrics1 = await analytics1.computeMetrics();
    const metrics2 = await analytics2.computeMetrics(metrics1);

    // Export graphs
    const graph1 = await scenario1Graph.exportGraph();
    const graph2 = await scenario2Graph.exportGraph();

    const nodeIds1 = new Set(graph1.nodes.map(n => n.id));
    const nodeIds2 = new Set(graph2.nodes.map(n => n.id));
    const edgeIds1 = new Set(graph1.edges.map(e => e.id));
    const edgeIds2 = new Set(graph2.edges.map(e => e.id));

    // Compute structural differences
    const nodesOnlyIn1 = Array.from(nodeIds1).filter(id => !nodeIds2.has(id));
    const nodesOnlyIn2 = Array.from(nodeIds2).filter(id => !nodeIds1.has(id));
    const edgesOnlyIn1 = Array.from(edgeIds1).filter(id => !edgeIds2.has(id));
    const edgesOnlyIn2 = Array.from(edgeIds2).filter(id => !edgeIds1.has(id));

    // Find modified nodes and edges
    const commonNodeIds = Array.from(nodeIds1).filter(id => nodeIds2.has(id));
    const commonEdgeIds = Array.from(edgeIds1).filter(id => edgeIds2.has(id));

    const modifiedNodes: string[] = [];
    const modifiedEdges: string[] = [];

    for (const nodeId of commonNodeIds) {
      const node1 = graph1.nodes.find(n => n.id === nodeId);
      const node2 = graph2.nodes.find(n => n.id === nodeId);
      if (node1 && node2 && !this.nodesEqual(node1, node2)) {
        modifiedNodes.push(nodeId);
      }
    }

    for (const edgeId of commonEdgeIds) {
      const edge1 = graph1.edges.find(e => e.id === edgeId);
      const edge2 = graph2.edges.find(e => e.id === edgeId);
      if (edge1 && edge2 && !this.edgesEqual(edge1, edge2)) {
        modifiedEdges.push(edgeId);
      }
    }

    // Generate summary
    const summary = this.generateComparisonSummary(
      metrics1,
      metrics2,
      { nodesOnlyIn1, nodesOnlyIn2, edgesOnlyIn1, edgesOnlyIn2, modifiedNodes, modifiedEdges }
    );

    return {
      scenario1Id: scenario1Graph.getScenarioId(),
      scenario2Id: scenario2Graph.getScenarioId(),
      scenario1Metrics: metrics1,
      scenario2Metrics: metrics2,
      deltas: metrics2.deltas,
      structuralDifferences: {
        nodesOnlyIn1,
        nodesOnlyIn2,
        edgesOnlyIn1,
        edgesOnlyIn2,
        modifiedNodes,
        modifiedEdges,
      },
      summary,
      computedAt: Date.now(),
    };
  }

  // ============================================================================
  // Graph Algorithms
  // ============================================================================

  /**
   * PageRank computation
   */
  private computePageRank(
    nodes: ScenarioNode[],
    adjacency: Map<string, { outgoing: Set<string>; incoming: Set<string> }>
  ): Map<string, number> {
    const n = nodes.length;
    if (n === 0) return new Map();

    const { pageRankDampingFactor: d, pageRankMaxIterations, pageRankTolerance } = this.config;

    const pageRank = new Map<string, number>();
    const newPageRank = new Map<string, number>();

    // Initialize
    for (const node of nodes) {
      pageRank.set(node.id, 1 / n);
    }

    // Iterate
    for (let iteration = 0; iteration < pageRankMaxIterations; iteration++) {
      let delta = 0;

      for (const node of nodes) {
        let sum = 0;
        const adj = adjacency.get(node.id);

        if (adj) {
          for (const neighborId of adj.incoming) {
            const neighborAdj = adjacency.get(neighborId);
            const outDegree = neighborAdj?.outgoing.size || 0;
            if (outDegree > 0) {
              sum += (pageRank.get(neighborId) ?? 0) / outDegree;
            }
          }
        }

        const newRank = (1 - d) / n + d * sum;
        newPageRank.set(node.id, newRank);
        delta += Math.abs(newRank - (pageRank.get(node.id) ?? 0));
      }

      for (const node of nodes) {
        pageRank.set(node.id, newPageRank.get(node.id)!);
      }

      if (delta < pageRankTolerance) {
        break;
      }
    }

    return pageRank;
  }

  /**
   * Betweenness centrality computation (Brandes algorithm)
   */
  private computeBetweennessCentrality(
    nodes: ScenarioNode[],
    adjacency: Map<string, { outgoing: Set<string>; incoming: Set<string> }>
  ): Map<string, number> {
    const betweenness = new Map<string, number>();

    for (const node of nodes) {
      betweenness.set(node.id, 0);
    }

    for (const source of nodes) {
      const stack: string[] = [];
      const predecessors = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const distance = new Map<string, number>();
      const delta = new Map<string, number>();

      for (const node of nodes) {
        predecessors.set(node.id, []);
        sigma.set(node.id, 0);
        distance.set(node.id, -1);
        delta.set(node.id, 0);
      }

      sigma.set(source.id, 1);
      distance.set(source.id, 0);

      const queue = [source.id];

      // BFS
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);

        const adj = adjacency.get(v);
        if (adj) {
          for (const w of adj.outgoing) {
            if (distance.get(w)! < 0) {
              queue.push(w);
              distance.set(w, distance.get(v)! + 1);
            }

            if (distance.get(w)! === distance.get(v)! + 1) {
              sigma.set(w, sigma.get(w)! + sigma.get(v)!);
              predecessors.get(w)!.push(v);
            }
          }
        }
      }

      // Accumulation
      while (stack.length > 0) {
        const w = stack.pop()!;
        const preds = predecessors.get(w)!;

        for (const v of preds) {
          const coefficient = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
          delta.set(v, delta.get(v)! + coefficient);
        }

        if (w !== source.id) {
          betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
        }
      }
    }

    // Normalize
    const n = nodes.length;
    if (n > 2) {
      const normalization = 2 / ((n - 1) * (n - 2));
      for (const node of nodes) {
        betweenness.set(node.id, betweenness.get(node.id)! * normalization);
      }
    }

    return betweenness;
  }

  /**
   * Compute path metrics using BFS
   */
  private computePathMetrics(
    nodes: ScenarioNode[],
    adjacency: Map<string, { outgoing: Set<string>; incoming: Set<string> }>
  ): { avgPathLength?: number; diameter?: number } {
    if (nodes.length < 2) {
      return {};
    }

    let totalPathLength = 0;
    let pathCount = 0;
    let maxPathLength = 0;

    // Sample nodes for large graphs
    const sampleSize = Math.min(nodes.length, 100);
    const sampledNodes = this.sampleNodes(nodes, sampleSize);

    for (const source of sampledNodes) {
      const distances = this.bfsDistances(source.id, adjacency);

      for (const [targetId, distance] of distances) {
        if (targetId !== source.id && distance > 0 && distance < Infinity) {
          totalPathLength += distance;
          pathCount++;
          maxPathLength = Math.max(maxPathLength, distance);
        }
      }
    }

    return {
      avgPathLength: pathCount > 0 ? totalPathLength / pathCount : undefined,
      diameter: maxPathLength > 0 ? maxPathLength : undefined,
    };
  }

  /**
   * Compute clustering coefficient
   */
  private computeClusteringCoefficient(
    nodes: ScenarioNode[],
    adjacency: Map<string, { outgoing: Set<string>; incoming: Set<string> }>
  ): number {
    if (nodes.length < 3) return 0;

    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of nodes) {
      const adj = adjacency.get(node.id);
      if (!adj) continue;

      const neighbors = new Set([...adj.outgoing, ...adj.incoming]);
      const k = neighbors.size;

      if (k < 2) continue;

      // Count edges between neighbors
      let triangles = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        const neighborAdj = adjacency.get(neighborArray[i]);
        if (neighborAdj) {
          for (let j = i + 1; j < neighborArray.length; j++) {
            if (neighborAdj.outgoing.has(neighborArray[j]) ||
                neighborAdj.incoming.has(neighborArray[j])) {
              triangles++;
            }
          }
        }
      }

      const maxTriangles = (k * (k - 1)) / 2;
      totalCoefficient += triangles / maxTriangles;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  /**
   * Compute connected components
   */
  private computeConnectedComponents(
    nodes: ScenarioNode[],
    adjacency: Map<string, { outgoing: Set<string>; incoming: Set<string> }>
  ): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of nodes) {
      if (visited.has(node.id)) continue;

      const component: string[] = [];
      const queue = [node.id];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;

        visited.add(current);
        component.push(current);

        const adj = adjacency.get(current);
        if (adj) {
          for (const neighbor of [...adj.outgoing, ...adj.incoming]) {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  // ============================================================================
  // Specialized Metrics
  // ============================================================================

  /**
   * Compute risk-related metrics
   */
  private computeRiskMetrics(
    nodes: ScenarioNode[],
    edges: ScenarioEdge[]
  ): { aggregateScore: number; distribution: Record<string, number> } {
    const distribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalRisk = 0;
    let riskNodeCount = 0;

    for (const node of nodes) {
      const riskScore = node.properties.riskScore as number | undefined;
      if (riskScore !== undefined) {
        totalRisk += riskScore;
        riskNodeCount++;

        if (riskScore < 25) distribution.low++;
        else if (riskScore < 50) distribution.medium++;
        else if (riskScore < 75) distribution.high++;
        else distribution.critical++;
      }
    }

    const aggregateScore = riskNodeCount > 0 ? totalRisk / riskNodeCount : 0;

    return { aggregateScore, distribution };
  }

  /**
   * Compute detection-related metrics
   */
  private computeDetectionMetrics(
    nodes: ScenarioNode[],
    edges: ScenarioEdge[]
  ): { coverage: number; avgDetectionTime: number } {
    let detectedCount = 0;
    let totalDetectionTime = 0;
    let detectionTimeCount = 0;

    for (const node of nodes) {
      if (node.properties.detected === true) {
        detectedCount++;
        const detectionTime = node.properties.detectionTime as number | undefined;
        if (detectionTime !== undefined) {
          totalDetectionTime += detectionTime;
          detectionTimeCount++;
        }
      }
    }

    const coverage = nodes.length > 0 ? detectedCount / nodes.length : 0;
    const avgDetectionTime = detectionTimeCount > 0
      ? totalDetectionTime / detectionTimeCount
      : 0;

    return { coverage, avgDetectionTime };
  }

  /**
   * Compute resource-related metrics
   */
  private computeResourceMetrics(
    nodes: ScenarioNode[],
    edges: ScenarioEdge[]
  ): { load: number } {
    let totalLoad = 0;
    let loadCount = 0;

    for (const node of nodes) {
      const resourceLoad = node.properties.resourceLoad as number | undefined;
      if (resourceLoad !== undefined) {
        totalLoad += resourceLoad;
        loadCount++;
      }
    }

    return {
      load: loadCount > 0 ? totalLoad / loadCount : 0,
    };
  }

  // ============================================================================
  // Delta Computation
  // ============================================================================

  /**
   * Compute delta between two metric values
   */
  private computeDelta(current: MetricValue, baseline: MetricValue): MetricDelta {
    const absoluteDelta = current.value - baseline.value;
    const relativeDelta = baseline.value !== 0
      ? absoluteDelta / Math.abs(baseline.value)
      : (absoluteDelta !== 0 ? Infinity : 0);
    const percentChange = relativeDelta * 100;

    let direction: 'increase' | 'decrease' | 'unchanged';
    if (Math.abs(relativeDelta) < this.config.significanceThreshold) {
      direction = 'unchanged';
    } else if (absoluteDelta > 0) {
      direction = 'increase';
    } else {
      direction = 'decrease';
    }

    const significant = Math.abs(relativeDelta) >= this.config.significanceThreshold;

    return {
      metricName: current.name,
      baselineValue: baseline.value,
      scenarioValue: current.value,
      absoluteDelta,
      relativeDelta,
      percentChange,
      significant,
      direction,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private buildAdjacency(
    nodes: ScenarioNode[],
    edges: ScenarioEdge[]
  ): Map<string, { outgoing: Set<string>; incoming: Set<string> }> {
    const adjacency = new Map<string, { outgoing: Set<string>; incoming: Set<string> }>();

    for (const node of nodes) {
      adjacency.set(node.id, { outgoing: new Set(), incoming: new Set() });
    }

    for (const edge of edges) {
      adjacency.get(edge.sourceId)?.outgoing.add(edge.targetId);
      adjacency.get(edge.targetId)?.incoming.add(edge.sourceId);
    }

    return adjacency;
  }

  private bfsDistances(
    sourceId: string,
    adjacency: Map<string, { outgoing: Set<string>; incoming: Set<string> }>
  ): Map<string, number> {
    const distances = new Map<string, number>();
    const queue = [sourceId];
    distances.set(sourceId, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDistance = distances.get(current)!;

      const adj = adjacency.get(current);
      if (adj) {
        for (const neighbor of adj.outgoing) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, currentDistance + 1);
            queue.push(neighbor);
          }
        }
      }
    }

    return distances;
  }

  private getTopK(
    scores: Map<string, number>,
    k: number
  ): Array<{ nodeId: string; score: number }> {
    const results = Array.from(scores.entries())
      .map(([nodeId, score]) => ({ nodeId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  private computeAverage(values: Map<string, number>): number {
    if (values.size === 0) return 0;

    let sum = 0;
    for (const value of values.values()) {
      sum += value;
    }
    return sum / values.size;
  }

  private sampleNodes(nodes: ScenarioNode[], sampleSize: number): ScenarioNode[] {
    if (nodes.length <= sampleSize) return nodes;

    const sampled: ScenarioNode[] = [];
    const step = Math.floor(nodes.length / sampleSize);

    for (let i = 0; i < sampleSize; i++) {
      sampled.push(nodes[i * step]);
    }

    return sampled;
  }

  private createMetric(name: string, type: MetricType, value: number): MetricValue {
    return {
      name,
      type,
      value,
      confidence: 1,
      timestamp: Date.now(),
      metadata: {},
    };
  }

  private nodesEqual(node1: ScenarioNode, node2: ScenarioNode): boolean {
    return JSON.stringify(node1.properties) === JSON.stringify(node2.properties);
  }

  private edgesEqual(edge1: ScenarioEdge, edge2: ScenarioEdge): boolean {
    return (
      edge1.type === edge2.type &&
      edge1.weight === edge2.weight &&
      JSON.stringify(edge1.properties) === JSON.stringify(edge2.properties)
    );
  }

  // ============================================================================
  // Summary Generation
  // ============================================================================

  private generateSummary(
    metrics: MetricValue[],
    deltas: MetricDelta[],
    nodeCount: number,
    edgeCount: number
  ): string {
    const parts: string[] = [];

    parts.push(`Graph contains ${nodeCount} nodes and ${edgeCount} edges.`);

    const significantDeltas = deltas.filter(d => d.significant);
    if (significantDeltas.length > 0) {
      const increases = significantDeltas.filter(d => d.direction === 'increase');
      const decreases = significantDeltas.filter(d => d.direction === 'decrease');

      if (increases.length > 0) {
        parts.push(`Significant increases in: ${increases.map(d => d.metricName).join(', ')}.`);
      }
      if (decreases.length > 0) {
        parts.push(`Significant decreases in: ${decreases.map(d => d.metricName).join(', ')}.`);
      }
    }

    return parts.join(' ');
  }

  private generateWarnings(
    nodes: ScenarioNode[],
    edges: ScenarioEdge[],
    metrics: MetricValue[]
  ): string[] {
    const warnings: string[] = [];

    // Check for disconnected components
    const componentsMetric = metrics.find(m => m.name === 'connected_components');
    if (componentsMetric && componentsMetric.value > 1) {
      warnings.push(`Graph has ${componentsMetric.value} disconnected components.`);
    }

    // Check for high-risk nodes
    const highRiskNodes = nodes.filter(n =>
      (n.properties.riskScore as number | undefined) !== undefined &&
      (n.properties.riskScore as number) >= 75
    );
    if (highRiskNodes.length > 0) {
      warnings.push(`${highRiskNodes.length} high-risk nodes detected.`);
    }

    // Check for low density
    const densityMetric = metrics.find(m => m.name === 'density');
    if (densityMetric && densityMetric.value < 0.01) {
      warnings.push('Graph has very low density - may indicate sparse connections.');
    }

    return warnings;
  }

  private generateRecommendations(
    metrics: MetricValue[],
    deltas: MetricDelta[]
  ): string[] {
    const recommendations: string[] = [];

    // Check if detection coverage decreased
    const coverageDelta = deltas.find(d => d.metricName === 'detection_coverage');
    if (coverageDelta && coverageDelta.direction === 'decrease' && coverageDelta.significant) {
      recommendations.push('Consider adding detection rules to maintain coverage.');
    }

    // Check if risk increased
    const riskDelta = deltas.find(d => d.metricName === 'aggregate_risk_score');
    if (riskDelta && riskDelta.direction === 'increase' && riskDelta.significant) {
      recommendations.push('Review high-risk nodes and consider mitigation actions.');
    }

    // Check if path length increased significantly
    const pathDelta = deltas.find(d => d.metricName === 'avg_path_length');
    if (pathDelta && pathDelta.direction === 'increase' && pathDelta.percentChange > 50) {
      recommendations.push('Increased path lengths may impact detection time.');
    }

    return recommendations;
  }

  private generateComparisonSummary(
    metrics1: OutcomeMetrics,
    metrics2: OutcomeMetrics,
    structuralDiffs: {
      nodesOnlyIn1: string[];
      nodesOnlyIn2: string[];
      edgesOnlyIn1: string[];
      edgesOnlyIn2: string[];
      modifiedNodes: string[];
      modifiedEdges: string[];
    }
  ): string {
    const parts: string[] = [];

    parts.push(`Scenario 1: ${metrics1.nodeCount} nodes, ${metrics1.edgeCount} edges.`);
    parts.push(`Scenario 2: ${metrics2.nodeCount} nodes, ${metrics2.edgeCount} edges.`);

    if (structuralDiffs.nodesOnlyIn1.length > 0) {
      parts.push(`${structuralDiffs.nodesOnlyIn1.length} nodes removed.`);
    }
    if (structuralDiffs.nodesOnlyIn2.length > 0) {
      parts.push(`${structuralDiffs.nodesOnlyIn2.length} nodes added.`);
    }
    if (structuralDiffs.modifiedNodes.length > 0) {
      parts.push(`${structuralDiffs.modifiedNodes.length} nodes modified.`);
    }

    if (structuralDiffs.edgesOnlyIn1.length > 0) {
      parts.push(`${structuralDiffs.edgesOnlyIn1.length} edges removed.`);
    }
    if (structuralDiffs.edgesOnlyIn2.length > 0) {
      parts.push(`${structuralDiffs.edgesOnlyIn2.length} edges added.`);
    }
    if (structuralDiffs.modifiedEdges.length > 0) {
      parts.push(`${structuralDiffs.modifiedEdges.length} edges modified.`);
    }

    return parts.join(' ');
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  clearCache(): void {
    this.metricsCache.clear();
  }

  getCachedMetrics(scenarioId: string): MetricValue[] | undefined {
    return this.metricsCache.get(scenarioId);
  }
}
