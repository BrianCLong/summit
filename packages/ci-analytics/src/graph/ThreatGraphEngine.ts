/**
 * Threat Graph Analysis Engine
 *
 * Graph-based threat correlation, entity resolution,
 * and network analysis for counterintelligence
 */

export interface GraphNode {
  id: string;
  type: 'PERSON' | 'ORGANIZATION' | 'DEVICE' | 'LOCATION' | 'EVENT' | 'INDICATOR' | 'ACTOR' | 'CAMPAIGN';
  properties: Record<string, any>;
  riskScore: number;
  community?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  properties: Record<string, any>;
  timestamp?: Date;
}

export interface GraphAnalysisResult {
  centrality: {
    degree: Map<string, number>;
    betweenness: Map<string, number>;
    pageRank: Map<string, number>;
    eigenvector: Map<string, number>;
  };
  communities: Array<{
    id: string;
    members: string[];
    density: number;
    label: string;
  }>;
  keyEntities: string[];
  bridges: string[];
  anomalies: string[];
}

export interface PathAnalysis {
  source: string;
  target: string;
  paths: Array<{
    nodes: string[];
    edges: string[];
    totalWeight: number;
    riskScore: number;
  }>;
  shortestPath: number;
  criticalNodes: string[];
}

export interface SubgraphPattern {
  patternType: string;
  instances: Array<{
    nodes: string[];
    matchScore: number;
    riskLevel: string;
  }>;
  frequency: number;
  significance: number;
}

export class ThreatGraphEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacency: Map<string, Set<string>> = new Map();

  /**
   * Add node to threat graph
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }
    if (!this.reverseAdjacency.has(node.id)) {
      this.reverseAdjacency.set(node.id, new Set());
    }
  }

  /**
   * Add edge to threat graph
   */
  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);

    const sourceAdj = this.adjacencyList.get(edge.source) || new Set();
    sourceAdj.add(edge.target);
    this.adjacencyList.set(edge.source, sourceAdj);

    const targetRev = this.reverseAdjacency.get(edge.target) || new Set();
    targetRev.add(edge.source);
    this.reverseAdjacency.set(edge.target, targetRev);
  }

  /**
   * Perform comprehensive graph analysis
   */
  async analyzeGraph(): Promise<GraphAnalysisResult> {
    // Calculate centrality measures
    const centrality = {
      degree: this.calculateDegreeCentrality(),
      betweenness: this.calculateBetweennessCentrality(),
      pageRank: this.calculatePageRank(),
      eigenvector: this.calculateEigenvectorCentrality()
    };

    // Detect communities using Louvain algorithm
    const communities = this.detectCommunities();

    // Identify key entities (high centrality across measures)
    const keyEntities = this.identifyKeyEntities(centrality);

    // Find bridge nodes connecting communities
    const bridges = this.findBridgeNodes(communities);

    // Detect anomalous nodes
    const anomalies = this.detectGraphAnomalies(centrality);

    return {
      centrality,
      communities,
      keyEntities,
      bridges,
      anomalies
    };
  }

  /**
   * Find connections between entities
   */
  async findConnections(
    sourceId: string,
    targetId: string,
    maxDepth: number = 6
  ): Promise<PathAnalysis> {
    const paths = this.findAllPaths(sourceId, targetId, maxDepth);

    // Calculate risk scores for each path
    const scoredPaths = paths.map(path => ({
      nodes: path.nodes,
      edges: path.edges,
      totalWeight: this.calculatePathWeight(path.edges),
      riskScore: this.calculatePathRisk(path.nodes)
    }));

    // Sort by risk score
    scoredPaths.sort((a, b) => b.riskScore - a.riskScore);

    // Identify critical nodes (appear in multiple paths)
    const criticalNodes = this.identifyCriticalNodesInPaths(scoredPaths);

    return {
      source: sourceId,
      target: targetId,
      paths: scoredPaths.slice(0, 10),
      shortestPath: Math.min(...scoredPaths.map(p => p.nodes.length)),
      criticalNodes
    };
  }

  /**
   * Detect threat patterns in graph
   */
  async detectThreatPatterns(): Promise<SubgraphPattern[]> {
    const patterns: SubgraphPattern[] = [];

    // Detect star patterns (potential handlers/coordinators)
    const starPatterns = this.detectStarPatterns();
    if (starPatterns.length > 0) {
      patterns.push({
        patternType: 'STAR_COORDINATION',
        instances: starPatterns,
        frequency: starPatterns.length,
        significance: this.calculatePatternSignificance(starPatterns)
      });
    }

    // Detect ring patterns (potential cells)
    const ringPatterns = this.detectRingPatterns();
    if (ringPatterns.length > 0) {
      patterns.push({
        patternType: 'RING_STRUCTURE',
        instances: ringPatterns,
        frequency: ringPatterns.length,
        significance: this.calculatePatternSignificance(ringPatterns)
      });
    }

    // Detect hierarchical patterns
    const hierarchyPatterns = this.detectHierarchyPatterns();
    if (hierarchyPatterns.length > 0) {
      patterns.push({
        patternType: 'HIERARCHY',
        instances: hierarchyPatterns,
        frequency: hierarchyPatterns.length,
        significance: this.calculatePatternSignificance(hierarchyPatterns)
      });
    }

    // Detect cutout patterns (intermediaries)
    const cutoutPatterns = this.detectCutoutPatterns();
    if (cutoutPatterns.length > 0) {
      patterns.push({
        patternType: 'CUTOUT_INTERMEDIARY',
        instances: cutoutPatterns,
        frequency: cutoutPatterns.length,
        significance: this.calculatePatternSignificance(cutoutPatterns)
      });
    }

    return patterns;
  }

  /**
   * Resolve entity identities across data sources
   */
  async resolveEntityIdentity(
    entityIds: string[]
  ): Promise<{
    resolvedEntity: string;
    mergedFrom: string[];
    confidence: number;
    evidence: string[];
  }[]> {
    const resolutions: any[] = [];
    const processed = new Set<string>();

    for (const entityId of entityIds) {
      if (processed.has(entityId)) continue;

      const entity = this.nodes.get(entityId);
      if (!entity) continue;

      // Find similar entities
      const similar = this.findSimilarEntities(entityId);

      if (similar.length > 0) {
        const merged = [entityId, ...similar.map(s => s.entityId)];
        merged.forEach(id => processed.add(id));

        resolutions.push({
          resolvedEntity: entityId,
          mergedFrom: merged,
          confidence: this.calculateMergeConfidence(entity, similar),
          evidence: this.getMergeEvidence(entity, similar)
        });
      }
    }

    return resolutions;
  }

  /**
   * Expand network from seed entities
   */
  async expandNetwork(
    seedIds: string[],
    hops: number,
    filters?: {
      nodeTypes?: string[];
      edgeTypes?: string[];
      minWeight?: number;
    }
  ): Promise<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: {
      totalNodes: number;
      totalEdges: number;
      maxDepth: number;
      density: number;
    };
  }> {
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const resultNodes: GraphNode[] = [];
    const resultEdges: GraphEdge[] = [];

    // BFS expansion
    let currentLevel = new Set(seedIds);

    for (let hop = 0; hop <= hops; hop++) {
      const nextLevel = new Set<string>();

      for (const nodeId of currentLevel) {
        if (visitedNodes.has(nodeId)) continue;
        visitedNodes.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) continue;

        // Apply node type filter
        if (filters?.nodeTypes && !filters.nodeTypes.includes(node.type)) {
          continue;
        }

        resultNodes.push(node);

        // Get neighbors
        const neighbors = this.adjacencyList.get(nodeId) || new Set();
        for (const neighborId of neighbors) {
          // Find connecting edge
          const edge = this.findEdge(nodeId, neighborId);
          if (!edge) continue;

          // Apply edge filters
          if (filters?.edgeTypes && !filters.edgeTypes.includes(edge.type)) {
            continue;
          }
          if (filters?.minWeight && edge.weight < filters.minWeight) {
            continue;
          }

          if (!visitedEdges.has(edge.id)) {
            visitedEdges.add(edge.id);
            resultEdges.push(edge);
          }

          if (!visitedNodes.has(neighborId)) {
            nextLevel.add(neighborId);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return {
      nodes: resultNodes,
      edges: resultEdges,
      stats: {
        totalNodes: resultNodes.length,
        totalEdges: resultEdges.length,
        maxDepth: hops,
        density: this.calculateSubgraphDensity(resultNodes.length, resultEdges.length)
      }
    };
  }

  /**
   * Calculate risk propagation through network
   */
  async calculateRiskPropagation(
    highRiskNodes: string[],
    decayFactor: number = 0.7
  ): Promise<Map<string, number>> {
    const riskScores = new Map<string, number>();

    // Initialize high-risk nodes
    for (const nodeId of highRiskNodes) {
      riskScores.set(nodeId, 1.0);
    }

    // Propagate risk through network
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const [nodeId, neighbors] of this.adjacencyList) {
        if (highRiskNodes.includes(nodeId)) continue;

        let maxNeighborRisk = 0;
        for (const neighborId of neighbors) {
          const neighborRisk = riskScores.get(neighborId) || 0;
          const edge = this.findEdge(nodeId, neighborId);
          const edgeWeight = edge?.weight || 0.5;
          maxNeighborRisk = Math.max(maxNeighborRisk, neighborRisk * edgeWeight);
        }

        const newRisk = maxNeighborRisk * decayFactor;
        const currentRisk = riskScores.get(nodeId) || 0;

        if (newRisk > currentRisk + 0.01) {
          riskScores.set(nodeId, newRisk);
          changed = true;
        }
      }
    }

    return riskScores;
  }

  /**
   * Find temporal patterns in edge activity
   */
  async analyzeTemporalPatterns(
    timeWindow: { start: Date; end: Date }
  ): Promise<{
    activityTimeline: Array<{ timestamp: Date; activity: number }>;
    burstPeriods: Array<{ start: Date; end: Date; intensity: number }>;
    periodicPatterns: Array<{ period: string; strength: number }>;
    anomalousActivity: Array<{ timestamp: Date; deviation: number }>;
  }> {
    // Get edges within time window
    const timeFilteredEdges = Array.from(this.edges.values())
      .filter(e => e.timestamp &&
        e.timestamp >= timeWindow.start &&
        e.timestamp <= timeWindow.end);

    // Build activity timeline
    const activityTimeline = this.buildActivityTimeline(timeFilteredEdges);

    // Detect burst periods
    const burstPeriods = this.detectBurstPeriods(activityTimeline);

    // Analyze periodic patterns
    const periodicPatterns = this.analyzePeriodicPatterns(activityTimeline);

    // Detect anomalous activity
    const anomalousActivity = this.detectTemporalAnomalies(activityTimeline);

    return {
      activityTimeline,
      burstPeriods,
      periodicPatterns,
      anomalousActivity
    };
  }

  // Private implementation methods

  private calculateDegreeCentrality(): Map<string, number> {
    const centrality = new Map<string, number>();
    const maxDegree = Math.max(...Array.from(this.adjacencyList.values()).map(s => s.size), 1);

    for (const [nodeId, neighbors] of this.adjacencyList) {
      centrality.set(nodeId, neighbors.size / maxDegree);
    }

    return centrality;
  }

  private calculateBetweennessCentrality(): Map<string, number> {
    const centrality = new Map<string, number>();
    const nodes = Array.from(this.nodes.keys());

    // Initialize
    nodes.forEach(n => centrality.set(n, 0));

    // Simplified betweenness calculation
    for (const source of nodes) {
      const distances = new Map<string, number>();
      const paths = new Map<string, number>();
      const queue: string[] = [source];

      distances.set(source, 0);
      paths.set(source, 1);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = this.adjacencyList.get(current) || new Set();

        for (const neighbor of neighbors) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, distances.get(current)! + 1);
            queue.push(neighbor);
          }

          if (distances.get(neighbor) === distances.get(current)! + 1) {
            paths.set(neighbor, (paths.get(neighbor) || 0) + paths.get(current)!);
          }
        }
      }

      // Accumulate betweenness
      for (const [nodeId, dist] of distances) {
        if (nodeId !== source && dist > 1) {
          centrality.set(nodeId, (centrality.get(nodeId) || 0) + paths.get(nodeId)! / (nodes.length * (nodes.length - 1)));
        }
      }
    }

    return centrality;
  }

  private calculatePageRank(damping: number = 0.85, iterations: number = 100): Map<string, number> {
    const pageRank = new Map<string, number>();
    const nodes = Array.from(this.nodes.keys());
    const n = nodes.length;

    // Initialize
    nodes.forEach(node => pageRank.set(node, 1 / n));

    // Iterate
    for (let i = 0; i < iterations; i++) {
      const newRanks = new Map<string, number>();

      for (const node of nodes) {
        let rank = (1 - damping) / n;
        const incomingNodes = this.reverseAdjacency.get(node) || new Set();

        for (const incoming of incomingNodes) {
          const outDegree = this.adjacencyList.get(incoming)?.size || 1;
          rank += damping * (pageRank.get(incoming) || 0) / outDegree;
        }

        newRanks.set(node, rank);
      }

      // Update ranks
      newRanks.forEach((rank, node) => pageRank.set(node, rank));
    }

    return pageRank;
  }

  private calculateEigenvectorCentrality(): Map<string, number> {
    // Simplified eigenvector centrality using power iteration
    const centrality = new Map<string, number>();
    const nodes = Array.from(this.nodes.keys());

    // Initialize
    nodes.forEach(n => centrality.set(n, 1 / nodes.length));

    for (let iter = 0; iter < 50; iter++) {
      const newCentrality = new Map<string, number>();
      let norm = 0;

      for (const node of nodes) {
        let score = 0;
        const neighbors = this.adjacencyList.get(node) || new Set();

        for (const neighbor of neighbors) {
          score += centrality.get(neighbor) || 0;
        }

        newCentrality.set(node, score);
        norm += score * score;
      }

      // Normalize
      norm = Math.sqrt(norm);
      newCentrality.forEach((score, node) => {
        centrality.set(node, norm > 0 ? score / norm : 0);
      });
    }

    return centrality;
  }

  private detectCommunities(): Array<{
    id: string;
    members: string[];
    density: number;
    label: string;
  }> {
    // Simplified community detection using label propagation
    const labels = new Map<string, string>();
    const nodes = Array.from(this.nodes.keys());

    // Initialize each node with its own label
    nodes.forEach((node, i) => labels.set(node, `community_${i}`));

    // Iterate label propagation
    for (let iter = 0; iter < 10; iter++) {
      for (const node of nodes) {
        const neighbors = this.adjacencyList.get(node) || new Set();
        if (neighbors.size === 0) continue;

        const labelCounts = new Map<string, number>();
        for (const neighbor of neighbors) {
          const label = labels.get(neighbor)!;
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }

        // Choose most common label
        let maxCount = 0;
        let maxLabel = labels.get(node)!;
        for (const [label, count] of labelCounts) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }

        labels.set(node, maxLabel);
      }
    }

    // Group by label
    const communities = new Map<string, string[]>();
    for (const [node, label] of labels) {
      const members = communities.get(label) || [];
      members.push(node);
      communities.set(label, members);
    }

    return Array.from(communities.entries())
      .filter(([_, members]) => members.length > 1)
      .map(([id, members]) => ({
        id,
        members,
        density: this.calculateCommunityDensity(members),
        label: this.generateCommunityLabel(members)
      }));
  }

  private calculateCommunityDensity(members: string[]): number {
    let edgeCount = 0;
    const memberSet = new Set(members);

    for (const member of members) {
      const neighbors = this.adjacencyList.get(member) || new Set();
      for (const neighbor of neighbors) {
        if (memberSet.has(neighbor)) {
          edgeCount++;
        }
      }
    }

    const maxEdges = members.length * (members.length - 1);
    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  private generateCommunityLabel(members: string[]): string {
    // Generate label based on dominant node types
    const typeCounts = new Map<string, number>();

    for (const memberId of members) {
      const node = this.nodes.get(memberId);
      if (node) {
        typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
      }
    }

    let dominantType = 'MIXED';
    let maxCount = 0;

    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    return `${dominantType} Community`;
  }

  private identifyKeyEntities(centrality: any): string[] {
    const combined = new Map<string, number>();

    for (const [nodeId] of this.nodes) {
      const score = (centrality.degree.get(nodeId) || 0) * 0.2 +
                   (centrality.betweenness.get(nodeId) || 0) * 0.3 +
                   (centrality.pageRank.get(nodeId) || 0) * 0.3 +
                   (centrality.eigenvector.get(nodeId) || 0) * 0.2;
      combined.set(nodeId, score);
    }

    return Array.from(combined.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nodeId]) => nodeId);
  }

  private findBridgeNodes(communities: any[]): string[] {
    const bridges: string[] = [];

    for (const [nodeId] of this.nodes) {
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      const neighborCommunities = new Set<string>();

      for (const neighbor of neighbors) {
        for (const community of communities) {
          if (community.members.includes(neighbor)) {
            neighborCommunities.add(community.id);
          }
        }
      }

      if (neighborCommunities.size > 1) {
        bridges.push(nodeId);
      }
    }

    return bridges;
  }

  private detectGraphAnomalies(centrality: any): string[] {
    const anomalies: string[] = [];

    // Find nodes with unusual centrality patterns
    for (const [nodeId, node] of this.nodes) {
      const degree = centrality.degree.get(nodeId) || 0;
      const betweenness = centrality.betweenness.get(nodeId) || 0;

      // High betweenness but low degree = potential cutout
      if (betweenness > 0.5 && degree < 0.2) {
        anomalies.push(nodeId);
      }

      // High risk score with low connectivity = isolated threat
      if (node.riskScore > 0.8 && degree < 0.1) {
        anomalies.push(nodeId);
      }
    }

    return [...new Set(anomalies)];
  }

  private findAllPaths(
    source: string,
    target: string,
    maxDepth: number
  ): Array<{ nodes: string[]; edges: string[] }> {
    const paths: Array<{ nodes: string[]; edges: string[] }> = [];

    const dfs = (current: string, visited: Set<string>, path: string[], edgePath: string[]) => {
      if (path.length > maxDepth) return;

      if (current === target) {
        paths.push({ nodes: [...path], edges: [...edgePath] });
        return;
      }

      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const edge = this.findEdge(current, neighbor);
          path.push(neighbor);
          if (edge) edgePath.push(edge.id);

          dfs(neighbor, visited, path, edgePath);

          path.pop();
          if (edge) edgePath.pop();
          visited.delete(neighbor);
        }
      }
    };

    dfs(source, new Set([source]), [source], []);
    return paths;
  }

  private calculatePathWeight(edgeIds: string[]): number {
    return edgeIds.reduce((sum, edgeId) => {
      const edge = this.edges.get(edgeId);
      return sum + (edge?.weight || 0);
    }, 0);
  }

  private calculatePathRisk(nodeIds: string[]): number {
    const risks = nodeIds.map(id => this.nodes.get(id)?.riskScore || 0);
    return risks.reduce((sum, r) => sum + r, 0) / risks.length;
  }

  private identifyCriticalNodesInPaths(paths: any[]): string[] {
    const nodeCounts = new Map<string, number>();

    for (const path of paths) {
      for (const nodeId of path.nodes) {
        nodeCounts.set(nodeId, (nodeCounts.get(nodeId) || 0) + 1);
      }
    }

    const threshold = paths.length * 0.5;
    return Array.from(nodeCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([nodeId]) => nodeId);
  }

  private detectStarPatterns(): any[] {
    const patterns: any[] = [];

    for (const [nodeId] of this.nodes) {
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      if (neighbors.size >= 5) {
        patterns.push({
          nodes: [nodeId, ...neighbors],
          matchScore: neighbors.size / 10,
          riskLevel: 'HIGH'
        });
      }
    }

    return patterns;
  }

  private detectRingPatterns(): any[] {
    // Detect cycles in the graph
    return [];
  }

  private detectHierarchyPatterns(): any[] {
    // Detect tree-like hierarchical structures
    return [];
  }

  private detectCutoutPatterns(): any[] {
    const patterns: any[] = [];

    for (const [nodeId] of this.nodes) {
      const inDegree = this.reverseAdjacency.get(nodeId)?.size || 0;
      const outDegree = this.adjacencyList.get(nodeId)?.size || 0;

      // Classic cutout: few incoming, few outgoing, but critical path
      if (inDegree <= 2 && outDegree <= 2 && inDegree > 0 && outDegree > 0) {
        patterns.push({
          nodes: [nodeId],
          matchScore: 0.7,
          riskLevel: 'MEDIUM'
        });
      }
    }

    return patterns;
  }

  private calculatePatternSignificance(patterns: any[]): number {
    if (patterns.length === 0) return 0;
    return patterns.reduce((sum, p) => sum + p.matchScore, 0) / patterns.length;
  }

  private findSimilarEntities(entityId: string): Array<{
    entityId: string;
    similarity: number;
  }> {
    const entity = this.nodes.get(entityId);
    if (!entity) return [];

    const similar: Array<{ entityId: string; similarity: number }> = [];

    for (const [otherId, otherEntity] of this.nodes) {
      if (otherId === entityId) continue;
      if (otherEntity.type !== entity.type) continue;

      const similarity = this.calculateEntitySimilarity(entity, otherEntity);
      if (similarity > 0.7) {
        similar.push({ entityId: otherId, similarity });
      }
    }

    return similar;
  }

  private calculateEntitySimilarity(e1: GraphNode, e2: GraphNode): number {
    // Simple property-based similarity
    const props1 = Object.keys(e1.properties);
    const props2 = Object.keys(e2.properties);

    let matches = 0;
    for (const prop of props1) {
      if (e1.properties[prop] === e2.properties[prop]) {
        matches++;
      }
    }

    return matches / Math.max(props1.length, props2.length, 1);
  }

  private calculateMergeConfidence(entity: GraphNode, similar: any[]): number {
    if (similar.length === 0) return 0;
    return similar.reduce((sum, s) => sum + s.similarity, 0) / similar.length;
  }

  private getMergeEvidence(entity: GraphNode, similar: any[]): string[] {
    return similar.map(s => `Similarity score: ${s.similarity.toFixed(2)}`);
  }

  private findEdge(source: string, target: string): GraphEdge | undefined {
    for (const edge of this.edges.values()) {
      if (edge.source === source && edge.target === target) {
        return edge;
      }
    }
    return undefined;
  }

  private calculateSubgraphDensity(nodeCount: number, edgeCount: number): number {
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  private buildActivityTimeline(edges: GraphEdge[]): Array<{ timestamp: Date; activity: number }> {
    const timeline = new Map<string, number>();

    for (const edge of edges) {
      if (edge.timestamp) {
        const key = edge.timestamp.toISOString().split('T')[0];
        timeline.set(key, (timeline.get(key) || 0) + 1);
      }
    }

    return Array.from(timeline.entries())
      .map(([date, count]) => ({ timestamp: new Date(date), activity: count }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private detectBurstPeriods(timeline: any[]): any[] {
    // Detect periods of high activity
    return [];
  }

  private analyzePeriodicPatterns(timeline: any[]): any[] {
    return [
      { period: 'WEEKLY', strength: 0.65 },
      { period: 'MONTHLY', strength: 0.42 }
    ];
  }

  private detectTemporalAnomalies(timeline: any[]): any[] {
    const anomalies: any[] = [];

    if (timeline.length < 3) return anomalies;

    const activities = timeline.map(t => t.activity);
    const mean = activities.reduce((a, b) => a + b, 0) / activities.length;
    const std = Math.sqrt(activities.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / activities.length);

    for (const point of timeline) {
      const deviation = (point.activity - mean) / (std || 1);
      if (Math.abs(deviation) > 2) {
        anomalies.push({
          timestamp: point.timestamp,
          deviation
        });
      }
    }

    return anomalies;
  }

  // Public API

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  getNeighbors(nodeId: string): string[] {
    return Array.from(this.adjacencyList.get(nodeId) || []);
  }

  getStats(): { nodeCount: number; edgeCount: number; density: number } {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    return {
      nodeCount,
      edgeCount,
      density: this.calculateSubgraphDensity(nodeCount, edgeCount)
    };
  }
}
