import Graph from 'graphology';
import { betweennessCentrality, closenessCentrality, degreeCentrality } from 'graphology-metrics/centrality';
import { density, avgPathLength } from 'graphology-metrics/graph';
import { connectedComponents } from 'graphology-components';
import { dijkstra, allPaths } from 'graphology-shortest-path';
import type {
  SupplyChainNetwork,
  SupplyChainNode,
  SupplyChainEdge,
  NetworkAnalysisResult,
  CriticalPath,
  SinglePointOfFailure,
  BottleneckAnalysis,
  NetworkTopology,
  GeographicCluster,
  AlternativeSupplier,
} from './types';

/**
 * Supply Chain Network Mapper
 *
 * Multi-tier supplier network mapping, visualization, and analysis.
 * Identifies critical paths, bottlenecks, single points of failure,
 * and provides resilience recommendations.
 */
export class NetworkMapper {
  private graph: Graph;
  private network: SupplyChainNetwork;

  constructor(network: SupplyChainNetwork) {
    this.network = network;
    this.graph = this.buildGraph(network);
  }

  /**
   * Build a Graphology graph from the supply chain network
   */
  private buildGraph(network: SupplyChainNetwork): Graph {
    const graph = new Graph({ type: 'directed', multi: false });

    // Add nodes
    for (const node of network.nodes) {
      graph.addNode(node.id, {
        ...node,
        weight: this.calculateNodeWeight(node),
      });
    }

    // Add edges
    for (const edge of network.edges) {
      if (graph.hasNode(edge.sourceId) && graph.hasNode(edge.targetId)) {
        graph.addEdge(edge.sourceId, edge.targetId, {
          ...edge,
          weight: this.calculateEdgeWeight(edge),
        });
      }
    }

    return graph;
  }

  /**
   * Calculate node importance weight
   */
  private calculateNodeWeight(node: SupplyChainNode): number {
    let weight = 1.0;

    // Higher weight for critical tiers
    if (node.tier === 'tier1') weight *= 1.5;
    if (node.tier === 'tier2') weight *= 1.3;

    // Higher weight for at-risk nodes
    if (node.status === 'at_risk') weight *= 1.4;
    if (node.status === 'disrupted') weight *= 2.0;

    // Consider risk score
    if (node.riskScore) {
      weight *= (1 + node.riskScore / 100);
    }

    return weight;
  }

  /**
   * Calculate edge importance weight
   */
  private calculateEdgeWeight(edge: SupplyChainEdge): number {
    let weight = 1.0;

    // Critical relationships have higher weight
    if (edge.criticality === 'critical') weight = 10;
    else if (edge.criticality === 'high') weight = 5;
    else if (edge.criticality === 'medium') weight = 2;

    // Dependency score influences weight
    weight *= (1 + edge.dependencyScore / 100);

    // No alternatives increases weight
    if (!edge.alternativesAvailable) {
      weight *= 1.5;
    }

    return weight;
  }

  /**
   * Identify critical paths in the supply chain
   */
  findCriticalPaths(rootNodeId?: string): CriticalPath[] {
    const root = rootNodeId || this.network.metadata.rootNodeId;
    if (!root || !this.graph.hasNode(root)) {
      return [];
    }

    const criticalPaths: CriticalPath[] = [];
    const leafNodes = this.graph.nodes().filter(nodeId =>
      this.graph.outDegree(nodeId) === 0 && nodeId !== root
    );

    // Find all paths from root to leaf nodes
    for (const leafNode of leafNodes) {
      try {
        const paths = allPaths(this.graph, root, leafNode);

        for (const path of paths) {
          const leadTime = this.calculatePathLeadTime(path);
          const bottlenecks = this.identifyPathBottlenecks(path);
          const riskScore = this.calculatePathRisk(path);

          criticalPaths.push({
            path,
            totalLeadTime: leadTime,
            bottleneckNodes: bottlenecks,
            riskScore,
          });
        }
      } catch (error) {
        // No path exists - this is actually a critical finding
        console.warn(`No path from ${root} to ${leafNode}`);
      }
    }

    // Sort by risk score descending
    return criticalPaths.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Calculate total lead time for a path
   */
  private calculatePathLeadTime(path: string[]): number {
    let totalLeadTime = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const edgeData = this.graph.getEdgeAttributes(path[i], path[i + 1]);
      if (edgeData.leadTime) {
        totalLeadTime += edgeData.leadTime.average;
      }
    }

    return totalLeadTime;
  }

  /**
   * Identify bottleneck nodes in a path
   */
  private identifyPathBottlenecks(path: string[]): string[] {
    const bottlenecks: string[] = [];

    for (const nodeId of path) {
      const node = this.graph.getNodeAttributes(nodeId);

      // Check capacity utilization
      if (node.metrics?.capacityUtilization && node.metrics.capacityUtilization > 85) {
        bottlenecks.push(nodeId);
      }

      // Check if node has low reliability
      if (node.metrics?.reliabilityScore && node.metrics.reliabilityScore < 70) {
        bottlenecks.push(nodeId);
      }

      // Check status
      if (node.status === 'at_risk' || node.status === 'disrupted') {
        bottlenecks.push(nodeId);
      }
    }

    return [...new Set(bottlenecks)];
  }

  /**
   * Calculate risk score for a path
   */
  private calculatePathRisk(path: string[]): number {
    let totalRisk = 0;
    let count = 0;

    for (const nodeId of path) {
      const node = this.graph.getNodeAttributes(nodeId);
      if (node.riskScore !== undefined) {
        totalRisk += node.riskScore;
        count++;
      }
    }

    // Also consider edge risks
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.graph.getEdgeAttributes(path[i], path[i + 1]);
      if (edge.riskLevel) {
        const riskValue = edge.riskLevel === 'critical' ? 90 :
                         edge.riskLevel === 'high' ? 70 :
                         edge.riskLevel === 'medium' ? 50 : 30;
        totalRisk += riskValue;
        count++;
      }
    }

    return count > 0 ? totalRisk / count : 0;
  }

  /**
   * Identify single points of failure (articulation points)
   */
  findSinglePointsOfFailure(): SinglePointOfFailure[] {
    const spofs: SinglePointOfFailure[] = [];

    // An articulation point is a node whose removal increases the number of connected components
    const originalComponents = connectedComponents(this.graph.copy());
    const originalCount = originalComponents.length;

    for (const nodeId of this.graph.nodes()) {
      const testGraph = this.graph.copy();
      testGraph.dropNode(nodeId);

      const newComponents = connectedComponents(testGraph);
      const newCount = newComponents.length;

      if (newCount > originalCount) {
        // This is a single point of failure
        const impactedNodes = this.findImpactedNodes(nodeId);
        const alternatives = this.findAlternativeNodes(nodeId);

        spofs.push({
          nodeId,
          impactedNodes,
          impactScore: (impactedNodes.length / this.graph.order) * 100,
          alternatives: alternatives.map(altId => ({
            nodeId: altId,
            switchingCost: undefined,
            switchingTime: undefined,
          })),
        });
      }
    }

    // Sort by impact score descending
    return spofs.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Find nodes that would be impacted if a node fails
   */
  private findImpactedNodes(nodeId: string): string[] {
    const impacted = new Set<string>();

    // Find all nodes downstream of this node
    const toVisit = [nodeId];
    const visited = new Set<string>();

    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      this.graph.forEachOutNeighbor(current, neighbor => {
        impacted.add(neighbor);
        toVisit.push(neighbor);
      });
    }

    return Array.from(impacted);
  }

  /**
   * Find alternative nodes that could replace a failed node
   */
  private findAlternativeNodes(nodeId: string): string[] {
    const node = this.graph.getNodeAttributes(nodeId);
    const alternatives: string[] = [];

    // Find nodes with same type and similar capabilities
    for (const otherId of this.graph.nodes()) {
      if (otherId === nodeId) continue;

      const other = this.graph.getNodeAttributes(otherId);

      // Must be same type
      if (other.type !== node.type) continue;

      // Must be active
      if (other.status !== 'active') continue;

      // Check capability match
      const nodeCapabilities = node.metadata?.capabilities || [];
      const otherCapabilities = other.metadata?.capabilities || [];
      const matchCount = nodeCapabilities.filter(cap =>
        otherCapabilities.includes(cap)
      ).length;

      if (matchCount > 0) {
        alternatives.push(otherId);
      }
    }

    return alternatives;
  }

  /**
   * Analyze bottlenecks in the network
   */
  analyzeBottlenecks(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];

    for (const nodeId of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(nodeId);

      // Capacity bottleneck
      if (node.metrics?.capacityUtilization && node.metrics.capacityUtilization > 80) {
        bottlenecks.push({
          nodeId,
          type: 'capacity',
          severity: node.metrics.capacityUtilization > 95 ? 'critical' :
                   node.metrics.capacityUtilization > 90 ? 'high' : 'medium',
          throughputLimit: undefined,
          currentUtilization: node.metrics.capacityUtilization,
          recommendations: [
            'Consider increasing capacity',
            'Identify alternative suppliers',
            'Implement demand smoothing',
          ],
        });
      }

      // Quality bottleneck
      if (node.metrics?.qualityScore && node.metrics.qualityScore < 70) {
        bottlenecks.push({
          nodeId,
          type: 'quality',
          severity: node.metrics.qualityScore < 50 ? 'critical' :
                   node.metrics.qualityScore < 60 ? 'high' : 'medium',
          recommendations: [
            'Implement quality improvement program',
            'Increase inspection frequency',
            'Consider alternative suppliers',
          ],
        });
      }

      // Geographic concentration risk
      const geographicRisk = this.assessGeographicRisk(node.location.country);
      if (geographicRisk > 70) {
        bottlenecks.push({
          nodeId,
          type: 'geographic',
          severity: geographicRisk > 90 ? 'critical' : 'high',
          recommendations: [
            'Diversify geographic sourcing',
            'Establish regional backup suppliers',
            'Monitor geopolitical developments',
          ],
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Assess geographic concentration risk
   */
  private assessGeographicRisk(country: string): number {
    // Count nodes in this country
    const nodesInCountry = this.graph.nodes().filter(nodeId => {
      const node = this.graph.getNodeAttributes(nodeId);
      return node.location.country === country;
    }).length;

    const concentration = (nodesInCountry / this.graph.order) * 100;

    // High concentration is risky
    return Math.min(concentration * 1.5, 100);
  }

  /**
   * Analyze network topology
   */
  analyzeTopology(): NetworkTopology {
    const densityValue = density(this.graph);
    const avgPath = avgPathLength(this.graph);

    // Calculate centrality measures
    const betweenness = betweennessCentrality(this.graph);
    const closeness = closenessCentrality(this.graph);
    const degree = degreeCentrality(this.graph);

    // Identify central nodes
    const centralNodes = [];

    // Top 5 by betweenness centrality
    const topBetweenness = Object.entries(betweenness)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [nodeId, score] of topBetweenness) {
      centralNodes.push({
        nodeId,
        centralityScore: score,
        type: 'betweenness' as const,
      });
    }

    // Identify communities (connected components)
    const components = connectedComponents(this.graph);
    const communities = components.map((nodeIds, index) => ({
      id: `community-${index}`,
      nodeIds,
      modularity: this.calculateModularity(nodeIds),
    }));

    return {
      density: densityValue,
      avgPathLength: avgPath,
      clusteringCoefficient: this.calculateClusteringCoefficient(),
      centralNodes,
      communities,
    };
  }

  /**
   * Calculate clustering coefficient
   */
  private calculateClusteringCoefficient(): number {
    let totalCoefficient = 0;
    let count = 0;

    for (const nodeId of this.graph.nodes()) {
      const neighbors = this.graph.neighbors(nodeId);
      if (neighbors.length < 2) continue;

      let connections = 0;
      const maxConnections = (neighbors.length * (neighbors.length - 1)) / 2;

      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this.graph.hasEdge(neighbors[i], neighbors[j])) {
            connections++;
          }
        }
      }

      totalCoefficient += connections / maxConnections;
      count++;
    }

    return count > 0 ? totalCoefficient / count : 0;
  }

  /**
   * Calculate modularity for a community
   */
  private calculateModularity(nodeIds: string[]): number {
    // Simplified modularity calculation
    const internalEdges = nodeIds.reduce((sum, nodeId) => {
      return sum + this.graph.neighbors(nodeId).filter(n => nodeIds.includes(n)).length;
    }, 0) / 2; // Divide by 2 because each edge is counted twice

    const totalDegree = nodeIds.reduce((sum, nodeId) => {
      return sum + this.graph.degree(nodeId);
    }, 0);

    const m = this.graph.size; // Total edges
    return (internalEdges / m) - Math.pow(totalDegree / (2 * m), 2);
  }

  /**
   * Analyze geographic distribution
   */
  analyzeGeographicDistribution(): GeographicCluster[] {
    const clusterMap = new Map<string, string[]>();

    // Group nodes by country
    for (const nodeId of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(nodeId);
      const country = node.location.country;

      if (!clusterMap.has(country)) {
        clusterMap.set(country, []);
      }
      clusterMap.get(country)!.push(nodeId);
    }

    // Build cluster objects
    const clusters: GeographicCluster[] = [];
    const totalNodes = this.graph.order;

    for (const [country, nodeIds] of clusterMap) {
      const concentration = (nodeIds.length / totalNodes) * 100;
      const riskScore = this.calculateClusterRisk(nodeIds);

      clusters.push({
        region: this.getRegionForCountry(country),
        country,
        nodeIds,
        concentration,
        riskScore,
      });
    }

    return clusters.sort((a, b) => b.concentration - a.concentration);
  }

  /**
   * Calculate risk score for a geographic cluster
   */
  private calculateClusterRisk(nodeIds: string[]): number {
    let totalRisk = 0;
    let count = 0;

    for (const nodeId of nodeIds) {
      const node = this.graph.getNodeAttributes(nodeId);
      if (node.riskScore !== undefined) {
        totalRisk += node.riskScore;
        count++;
      }
    }

    // Higher concentration increases risk
    const concentration = (nodeIds.length / this.graph.order) * 100;
    const concentrationPenalty = concentration > 50 ? 20 : concentration > 30 ? 10 : 0;

    const avgRisk = count > 0 ? totalRisk / count : 50;
    return Math.min(avgRisk + concentrationPenalty, 100);
  }

  /**
   * Get region for country (simplified)
   */
  private getRegionForCountry(country: string): string {
    // This would be replaced with a proper mapping
    const regionMap: { [key: string]: string } = {
      'US': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'China': 'Asia',
      'Japan': 'Asia',
      'Germany': 'Europe',
      'UK': 'Europe',
      'France': 'Europe',
    };
    return regionMap[country] || 'Other';
  }

  /**
   * Find alternative suppliers for a given supplier
   */
  findAlternativeSuppliers(supplierId: string): AlternativeSupplier {
    const supplier = this.graph.getNodeAttributes(supplierId);
    const alternatives = this.findAlternativeNodes(supplierId);

    const evaluatedAlternatives = alternatives.map(altId => {
      const alt = this.graph.getNodeAttributes(altId);
      const matchScore = this.calculateSupplierMatchScore(supplier, alt);

      return {
        supplierId: altId,
        matchScore,
        capabilities: alt.metadata?.capabilities || [],
        advantages: this.identifyAdvantages(supplier, alt),
        disadvantages: this.identifyDisadvantages(supplier, alt),
        riskScore: alt.riskScore || 50,
      };
    });

    // Sort by match score descending
    evaluatedAlternatives.sort((a, b) => b.matchScore - a.matchScore);

    return {
      currentSupplierId: supplierId,
      alternatives: evaluatedAlternatives,
      recommendations: this.generateRecommendations(supplier, evaluatedAlternatives),
    };
  }

  /**
   * Calculate match score between two suppliers
   */
  private calculateSupplierMatchScore(supplier: any, alternative: any): number {
    let score = 0;

    // Same type
    if (supplier.type === alternative.type) score += 30;

    // Capability overlap
    const supplierCaps = supplier.metadata?.capabilities || [];
    const altCaps = alternative.metadata?.capabilities || [];
    const overlap = supplierCaps.filter((cap: string) => altCaps.includes(cap)).length;
    const capScore = (overlap / Math.max(supplierCaps.length, 1)) * 40;
    score += capScore;

    // Performance comparison
    if (alternative.metrics?.qualityScore && supplier.metrics?.qualityScore) {
      if (alternative.metrics.qualityScore >= supplier.metrics.qualityScore) {
        score += 15;
      }
    }

    // Lower risk is better
    if (alternative.riskScore && supplier.riskScore) {
      if (alternative.riskScore < supplier.riskScore) {
        score += 15;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Identify advantages of alternative supplier
   */
  private identifyAdvantages(current: any, alternative: any): string[] {
    const advantages: string[] = [];

    if (alternative.riskScore && current.riskScore && alternative.riskScore < current.riskScore) {
      advantages.push('Lower risk score');
    }

    if (alternative.metrics?.qualityScore && current.metrics?.qualityScore &&
        alternative.metrics.qualityScore > current.metrics.qualityScore) {
      advantages.push('Higher quality score');
    }

    if (alternative.location.country !== current.location.country) {
      advantages.push('Geographic diversification');
    }

    return advantages;
  }

  /**
   * Identify disadvantages of alternative supplier
   */
  private identifyDisadvantages(current: any, alternative: any): string[] {
    const disadvantages: string[] = [];

    if (alternative.metrics?.reliabilityScore && current.metrics?.reliabilityScore &&
        alternative.metrics.reliabilityScore < current.metrics.reliabilityScore) {
      disadvantages.push('Lower reliability score');
    }

    if (alternative.tier !== current.tier) {
      disadvantages.push('Different supplier tier');
    }

    return disadvantages;
  }

  /**
   * Generate recommendations for supplier alternatives
   */
  private generateRecommendations(supplier: any, alternatives: any[]): string[] {
    const recommendations: string[] = [];

    if (alternatives.length === 0) {
      recommendations.push('No suitable alternatives found - consider expanding supplier base');
      return recommendations;
    }

    const topAlternative = alternatives[0];
    if (topAlternative.matchScore > 80) {
      recommendations.push(`High-quality alternative available: ${topAlternative.supplierId}`);
    }

    if (alternatives.length < 2) {
      recommendations.push('Limited alternatives - consider qualifying additional suppliers');
    }

    if (supplier.riskScore && supplier.riskScore > 70) {
      recommendations.push('Current supplier has high risk - begin transition planning');
    }

    return recommendations;
  }

  /**
   * Perform comprehensive network analysis
   */
  analyzeNetwork(): NetworkAnalysisResult {
    const criticalPaths = this.findCriticalPaths();
    const singlePointsOfFailure = this.findSinglePointsOfFailure();
    const bottlenecks = this.analyzeBottlenecks();
    const topology = this.analyzeTopology();

    // Calculate overall scores
    const overallRiskScore = this.calculateOverallRiskScore();
    const resilienceScore = this.calculateResilienceScore(singlePointsOfFailure, bottlenecks);
    const diversificationScore = this.calculateDiversificationScore();

    // Generate recommendations
    const recommendations = this.generateNetworkRecommendations(
      criticalPaths,
      singlePointsOfFailure,
      bottlenecks
    );

    return {
      networkId: this.network.id,
      tenantId: this.network.tenantId,
      timestamp: new Date().toISOString(),
      criticalPaths,
      singlePointsOfFailure,
      bottlenecks,
      topology,
      overallRiskScore,
      resilienceScore,
      diversificationScore,
      recommendations,
    };
  }

  /**
   * Calculate overall risk score for the network
   */
  private calculateOverallRiskScore(): number {
    let totalRisk = 0;
    let count = 0;

    for (const nodeId of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(nodeId);
      if (node.riskScore !== undefined) {
        totalRisk += node.riskScore;
        count++;
      }
    }

    return count > 0 ? totalRisk / count : 0;
  }

  /**
   * Calculate resilience score
   */
  private calculateResilienceScore(spofs: SinglePointOfFailure[], bottlenecks: BottleneckAnalysis[]): number {
    let score = 100;

    // Penalize for single points of failure
    score -= spofs.length * 10;

    // Penalize for critical bottlenecks
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical').length;
    score -= criticalBottlenecks * 5;

    return Math.max(score, 0);
  }

  /**
   * Calculate diversification score
   */
  private calculateDiversificationScore(): number {
    const geoClusters = this.analyzeGeographicDistribution();

    // More countries = better diversification
    const countryCount = geoClusters.length;
    let score = Math.min(countryCount * 10, 50);

    // Penalize high concentration
    const maxConcentration = Math.max(...geoClusters.map(c => c.concentration));
    if (maxConcentration > 50) {
      score -= (maxConcentration - 50);
    }

    return Math.max(Math.min(score, 100), 0);
  }

  /**
   * Generate network-wide recommendations
   */
  private generateNetworkRecommendations(
    criticalPaths: CriticalPath[],
    spofs: SinglePointOfFailure[],
    bottlenecks: BottleneckAnalysis[]
  ): any[] {
    const recommendations: any[] = [];

    // Critical path recommendations
    const highRiskPaths = criticalPaths.filter(p => p.riskScore > 70);
    if (highRiskPaths.length > 0) {
      recommendations.push({
        priority: 'critical' as const,
        category: 'Critical Path Risk',
        description: `${highRiskPaths.length} critical paths have high risk scores`,
        impactedNodes: [...new Set(highRiskPaths.flatMap(p => p.path))],
      });
    }

    // SPOF recommendations
    if (spofs.length > 0) {
      recommendations.push({
        priority: 'critical' as const,
        category: 'Single Points of Failure',
        description: `${spofs.length} single points of failure identified`,
        impactedNodes: spofs.map(s => s.nodeId),
      });
    }

    // Bottleneck recommendations
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      recommendations.push({
        priority: 'high' as const,
        category: 'Critical Bottlenecks',
        description: `${criticalBottlenecks.length} critical bottlenecks require immediate attention`,
        impactedNodes: criticalBottlenecks.map(b => b.nodeId),
      });
    }

    return recommendations;
  }
}
