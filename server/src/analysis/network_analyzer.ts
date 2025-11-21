import { findShortestPath, findAllPaths, GraphPath } from '../algorithms/traversal';
import { calculateNodeDegreeCentrality, findKeyInfluencers, CentralityScore } from '../algorithms/centrality';

export interface NodeRiskAnalysis {
  nodeId: string | number;
  riskScore: number;
  factors: string[];
  centrality: number;
  shortestPathToTarget?: GraphPath | null;
}

export class NetworkAnalyzer {

  /**
   * Analyzes a node's risk based on its centrality and connectivity to a known bad actor (target).
   */
  async analyzeNodeRisk(
    suspectNodeId: string,
    knownBadActorId: string
  ): Promise<NodeRiskAnalysis> {

    // 1. Calculate centrality efficiently for this specific node
    const centralityScore = await calculateNodeDegreeCentrality(suspectNodeId, 'BOTH', 'id');

    // 2. Check path to bad actor
    const path = await findShortestPath(suspectNodeId, knownBadActorId, 'id');

    let riskScore = 0;
    const factors: string[] = [];

    if (centralityScore > 5) {
      riskScore += 20;
      factors.push('High Connectivity');
    }

    if (path) {
      const distance = path.length; // Length usually means number of relationships
      if (distance <= 1) {
        riskScore += 80;
        factors.push('Directly connected to bad actor');
      } else if (distance <= 2) {
        riskScore += 50;
        factors.push('2 hops from bad actor');
      } else {
        riskScore += 10;
        factors.push(`Connected to bad actor (distance: ${distance})`);
      }
    }

    return {
      nodeId: suspectNodeId,
      riskScore: Math.min(riskScore, 100),
      factors,
      centrality: centralityScore,
      shortestPathToTarget: path
    };
  }

  async findCommunityInfluencers(label: string = 'Person'): Promise<CentralityScore[]> {
    return findKeyInfluencers(10, label);
  }

  async tracePath(startId: string, endId: string): Promise<GraphPath | null> {
    return findShortestPath(startId, endId);
  }
}
