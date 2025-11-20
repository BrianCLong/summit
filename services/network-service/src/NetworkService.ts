/**
 * Network Analysis Service
 *
 * Provides REST API for network analysis operations
 */

import {
  Graph,
  GraphBuilder,
  CentralityMetrics,
  NetworkMetricsCalculator,
  MotifAnalyzer
} from '@intelgraph/network-analysis';
import { LouvainAlgorithm, LabelPropagation } from '@intelgraph/community-detection';
import { DiffusionSimulator, InfluenceMaximization } from '@intelgraph/influence-analysis';
import { LinkPredictor } from '@intelgraph/link-prediction';
import { LayoutEngine } from '@intelgraph/network-visualization';
import { SocialNetworkAnalyzer } from '@intelgraph/social-media-analysis';

export class NetworkService {
  private graphs: Map<string, Graph>;

  constructor() {
    this.graphs = new Map();
  }

  /**
   * Create a new graph
   */
  createGraph(
    id: string,
    nodes: Array<{ id: string; label?: string; attributes?: Record<string, any> }>,
    edges: Array<{ source: string; target: string; weight?: number }>,
    options: { directed?: boolean; weighted?: boolean } = {}
  ): Graph {
    const builder = new GraphBuilder(options.directed || false, options.weighted || false);

    nodes.forEach(node => builder.addNode(node));
    edges.forEach(edge => builder.addEdge(edge));

    const graph = builder.build();
    this.graphs.set(id, graph);

    return graph;
  }

  /**
   * Get graph by ID
   */
  getGraph(id: string): Graph | undefined {
    return this.graphs.get(id);
  }

  /**
   * Calculate centrality metrics
   */
  calculateCentrality(graphId: string, metric?: string): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const centrality = new CentralityMetrics(graph);

    if (metric === 'degree') {
      return Array.from(centrality.degreeCentrality().entries()).map(([nodeId, score]) => ({
        nodeId,
        score
      }));
    }

    if (metric === 'betweenness') {
      return Array.from(centrality.betweennessCentrality().entries()).map(([nodeId, score]) => ({
        nodeId,
        score
      }));
    }

    if (metric === 'pagerank') {
      return Array.from(centrality.pageRank().entries()).map(([nodeId, score]) => ({
        nodeId,
        score
      }));
    }

    // Return all metrics
    const allMetrics: any[] = [];
    const nodeIds = Array.from(graph.nodes.keys());

    nodeIds.forEach(nodeId => {
      allMetrics.push(centrality.calculateAllMetrics(nodeId));
    });

    return allMetrics;
  }

  /**
   * Detect communities
   */
  detectCommunities(graphId: string, algorithm = 'louvain'): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    if (algorithm === 'louvain') {
      const louvain = new LouvainAlgorithm(graph);
      const result = louvain.detectCommunities();

      return {
        algorithm: result.algorithm,
        modularity: result.modularity,
        coverage: result.coverage,
        communities: result.communities.map(c => ({
          id: c.id,
          members: Array.from(c.members),
          size: c.members.size,
          density: c.density
        }))
      };
    }

    if (algorithm === 'label_propagation') {
      const labelProp = new LabelPropagation(graph);
      const result = labelProp.detectCommunities();

      return {
        algorithm: result.algorithm,
        modularity: result.modularity,
        coverage: result.coverage,
        communities: result.communities.map(c => ({
          id: c.id,
          members: Array.from(c.members),
          size: c.members.size,
          density: c.density
        }))
      };
    }

    throw new Error(`Unknown algorithm: ${algorithm}`);
  }

  /**
   * Simulate influence diffusion
   */
  simulateDiffusion(
    graphId: string,
    seedNodes: string[],
    model: 'independent_cascade' | 'linear_threshold' = 'independent_cascade'
  ): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const simulator = new DiffusionSimulator(graph);
    const result = simulator.independentCascade(new Set(seedNodes));

    return {
      seedNodes: Array.from(result.seedNodes),
      activatedNodes: Array.from(result.activatedNodes),
      cascadeSize: result.cascadeSize,
      activationTimes: Array.from(result.activationTimes.entries()).map(([nodeId, time]) => ({
        nodeId,
        time
      }))
    };
  }

  /**
   * Predict links
   */
  predictLinks(graphId: string, method = 'ensemble', topK = 100): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const predictor = new LinkPredictor(graph);
    let predictions;

    if (method === 'ensemble') {
      predictions = predictor.ensemblePrediction(topK);
    } else if (method === 'common_neighbors') {
      predictions = predictor.commonNeighbors(topK);
    } else if (method === 'adamic_adar') {
      predictions = predictor.adamicAdar(topK);
    } else {
      predictions = predictor.ensemblePrediction(topK);
    }

    return predictions.map(p => ({
      source: p.sourceId,
      target: p.targetId,
      score: p.score,
      method: p.method
    }));
  }

  /**
   * Calculate network metrics
   */
  calculateNetworkMetrics(graphId: string): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const calculator = new NetworkMetricsCalculator(graph);
    const metrics = calculator.calculateAll();

    return {
      density: metrics.density,
      averagePathLength: metrics.averagePathLength,
      clusteringCoefficient: metrics.clusteringCoefficient,
      assortativity: metrics.assortativity,
      diameter: metrics.diameter,
      numberOfComponents: metrics.numberOfComponents,
      degreeDistribution: Array.from(metrics.degreeDistribution.entries()).map(([degree, count]) => ({
        degree,
        count
      })),
      isSmallWorld: calculator.isSmallWorld(),
      isScaleFree: calculator.isScaleFree()
    };
  }

  /**
   * Analyze motifs
   */
  analyzeMotifs(graphId: string): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const analyzer = new MotifAnalyzer(graph);

    return {
      triangleCount: analyzer.countTriangles(),
      triangles: analyzer.findTriangles().map(t => ({
        type: t.type,
        nodes: t.nodes
      })),
      motifs: Array.from(analyzer.find3NodeMotifs().values()).map(m => ({
        type: m.type,
        count: m.count
      })),
      structuralHoles: analyzer.findStructuralHoles(),
      bridges: analyzer.findBridges()
    };
  }

  /**
   * Apply layout
   */
  applyLayout(graphId: string, layoutType = 'force-directed', parameters: Record<string, any> = {}): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const engine = new LayoutEngine(graph);
    const layouted = engine.applyLayout({
      type: layoutType as any,
      parameters
    });

    return {
      nodes: layouted.nodes.map(n => ({
        id: n.id,
        label: n.label,
        position: n.position,
        attributes: n.attributes
      })),
      edges: layouted.edges
    };
  }

  /**
   * Detect bots in social network
   */
  detectBots(graphId: string, profiles: any[]): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const analyzer = new SocialNetworkAnalyzer(graph);
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const botScores = analyzer.detectBots(profileMap);

    return Array.from(botScores.values()).map(score => ({
      userId: score.userId,
      score: score.score,
      classification: score.classification,
      features: score.features
    }));
  }

  /**
   * Identify echo chambers
   */
  identifyEchoChambers(graphId: string): any {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Graph ${graphId} not found`);

    const analyzer = new SocialNetworkAnalyzer(graph);
    const chambers = analyzer.identifyEchoChambers();

    return chambers.map(chamber => ({
      members: Array.from(chamber.members),
      size: chamber.members.size,
      insularity: chamber.insularity,
      polarization: chamber.polarization
    }));
  }

  /**
   * Delete graph
   */
  deleteGraph(id: string): boolean {
    return this.graphs.delete(id);
  }

  /**
   * List all graphs
   */
  listGraphs(): Array<{ id: string; nodeCount: number; edgeCount: number }> {
    const result: Array<{ id: string; nodeCount: number; edgeCount: number }> = [];

    this.graphs.forEach((graph, id) => {
      result.push({
        id,
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length
      });
    });

    return result;
  }
}
