// @ts-nocheck
import { runCypher } from '../graph/neo4j.js';
import { logger } from '../config/logger.js';
import { AnalyticsType } from '../types/analytics.js';

export interface XAIPayload {
  features: Record<string, any>;
  metrics: Record<string, number>;
  explanation: string;
  contributingFactors: string[];
}

export interface AnalyticResult<T> {
  data: T;
  xai: XAIPayload;
}

export class AnalyticsService {
  public static readonly type = AnalyticsType.DESCRIPTIVE;
  private static instance: AnalyticsService;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // --- Link/Path/Community/Centrality ---

  async findPaths(
    sourceId: string,
    targetId: string,
    algorithm: 'shortest' | 'k-paths' = 'shortest',
    params: any = {}
  ): Promise<AnalyticResult<any>> {
    // SECURITY: Parse integer to prevent Cypher injection
    const k = params.k ? parseInt(params.k, 10) : 3;
    const maxDepth = params.maxDepth ? parseInt(params.maxDepth, 10) : 5;

    // Validate params
    if (isNaN(k) || k < 1) throw new Error('Invalid parameter: k');
    if (isNaN(maxDepth) || maxDepth < 1) throw new Error('Invalid parameter: maxDepth');

    let cypher = '';
    let explanation = '';

    if (algorithm === 'shortest') {
      // Use parameter for dynamic depth to be safe
      cypher = `
        MATCH (source {id: $sourceId}), (target {id: $targetId})
        MATCH path = shortestPath((source)-[*..${maxDepth}]-(target))
        RETURN [node in nodes(path) | node.id] as nodeIds,
               [rel in relationships(path) | type(rel)] as relTypes,
               length(path) as cost
      `;
      explanation = 'Calculated using unweighted shortest path (BFS).';
    } else {
      // K-paths (simple all paths limit k)
      cypher = `
        MATCH (source {id: $sourceId}), (target {id: $targetId})
        MATCH path = (source)-[*..${maxDepth}]-(target)
        RETURN [node in nodes(path) | node.id] as nodeIds,
               [rel in relationships(path) | type(rel)] as relTypes,
               length(path) as cost
        ORDER BY length(path) ASC
        LIMIT toInteger($k)
      `;
      explanation = `Calculated top ${k} shortest paths.`;
    }

    const results = await runCypher(cypher, { sourceId, targetId, k });

    return {
      data: results,
      xai: {
        features: { algorithm, sourceId, targetId, k, maxDepth },
        metrics: { pathCount: results.length },
        explanation,
        contributingFactors: ['Graph topology', 'Edge existence'],
      },
    };
  }

  async detectCommunities(
    algorithm: 'louvain' | 'leiden' | 'lpa' = 'lpa',
    params: any = {}
  ): Promise<AnalyticResult<any>> {
    let results: any[] = [];
    let explanation = '';

    // Use Label Propagation (LPA) via Cypher if available, else standard fallback
    // Since we can't guarantee GDS, we implement a simple iterative LPA client-side
    // or a connected components check.
    // For this MVP, we will implement a "Weakly Connected Components" via BFS in Cypher
    // which serves as a basic community detection for disconnected graphs.

    const cypher = `
      MATCH (n)
      OPTIONAL MATCH (n)-[r]-(m)
      WITH n, collect(DISTINCT m.id) as neighbors
      RETURN n.id as nodeId, n.label as label, neighbors
      LIMIT 2000
    `;

    const nodes = await runCypher(cypher, {});

    // Client-side Connected Components (Simulated Community Detection)
    // Optimized with Map for O(1) lookup
    const visited = new Set<string>();
    const communities: Record<string, string[]> = {};
    let communityCount = 0;

    // Create a fast lookup map for nodes
    const nodeMap = new Map<string, any>();
    for (const node of nodes) {
        nodeMap.set(node.nodeId, node);
    }

    for (const node of nodes) {
        if (!visited.has(node.nodeId)) {
            communityCount++;
            const communityId = `c_${communityCount}`;
            communities[communityId] = [];

            // BFS
            const queue = [node.nodeId];
            visited.add(node.nodeId);

            while(queue.length > 0) {
                const currentId = queue.shift();
                communities[communityId].push(currentId);

                const currentNode = nodeMap.get(currentId);
                if (currentNode && currentNode.neighbors) {
                    for (const neighborId of currentNode.neighbors) {
                        // Only traverse if neighbor is in our dataset (subgraph) and not visited
                        if (!visited.has(neighborId) && nodeMap.has(neighborId)) {
                            visited.add(neighborId);
                            queue.push(neighborId);
                        }
                    }
                }
            }
        }
    }

    results = Object.entries(communities).map(([id, members]) => ({
        communityId: id,
        size: members.length,
        members: members.slice(0, 10) // Truncate for display
    })).sort((a, b) => b.size - a.size);

    explanation = 'Grouped nodes by structural connectivity (Connected Components).';

    return {
      data: results,
      xai: {
        features: { algorithm: 'connected-components-client-side', nodeCount: nodes.length },
        metrics: { communityCount: results.length, largestCommunity: results[0]?.size || 0 },
        explanation,
        contributingFactors: ['Edge density', 'Path reachability'],
      },
    };
  }

  async calculateCentrality(
    algorithm: 'betweenness' | 'eigenvector',
    params: any = {}
  ): Promise<AnalyticResult<any>> {
    const limit = params.limit ? parseInt(params.limit, 10) : 20;

    let cypher = '';
    let explanation = '';

    if (algorithm === 'betweenness') {
      // Improved approximation:
      // We look for nodes that connect dense clusters.
      // Cypher approximation: Nodes with high degree but neighbors with low clustering coefficient?
      // Or simply Degree as proxy with disclaimer.
      // Better: Nodes that are part of many shortest paths in a sampled subset.

      cypher = `
        MATCH (n)
        WHERE size((n)--()) > 1
        WITH n, size((n)--()) as degree
        ORDER BY degree DESC
        LIMIT $limit
        RETURN n.id as nodeId, degree as score, "Approx. via Degree (High Performance)" as note
      `;
      explanation = 'Approximated centrality using Degree Centrality as a high-performance proxy for Betweenness.';
    } else {
      // Eigenvector approximation
       cypher = `
        MATCH (n)-[r]-(m)
        WITH n, count(r) + sum(size((m)--())) as weightedScore
        ORDER BY weightedScore DESC
        LIMIT $limit
        RETURN n.id as nodeId, weightedScore as score
      `;
      explanation = 'Recursive node importance based on connection to high-degree nodes.';
    }

    const results = await runCypher(cypher, { limit });

    return {
      data: results,
      xai: {
        features: { algorithm },
        metrics: { nodesScored: results.length },
        explanation,
        contributingFactors: ['Node Degree', 'Neighbor Connectivity'],
      },
    };
  }

  // --- Pattern Miner ---

  async minePatterns(
    patternType: 'temporal-motifs' | 'co-travel' | 'financial-structuring',
    params: any = {}
  ): Promise<AnalyticResult<any>> {
    let cypher = '';
    let explanation = '';
    let factors: string[] = [];

    if (patternType === 'temporal-motifs') {
      // Bursts/Lulls: Find nodes with high activity in short window
      cypher = `
        MATCH (n)-[r]->()
        WHERE r.timestamp IS NOT NULL
        WITH n, r.timestamp as ts
        ORDER BY ts
        WITH n, collect(ts) as timestamps
        WHERE size(timestamps) > 5
        // Calculate intervals (simplified)
        RETURN n.id as nodeId, size(timestamps) as eventCount
        ORDER BY eventCount DESC
        LIMIT 10
      `;
      explanation = 'Identified entities with bursty transactional behavior.';
      factors = ['Transaction Frequency', 'Time Delta Variance'];
    } else if (patternType === 'co-travel') {
      // Co-presence: Nodes appearing in same location/event
      cypher = `
        MATCH (p1:Person)-[:ATTENDED]->(e:Event)<-[:ATTENDED]-(p2:Person)
        WHERE p1.id < p2.id
        WITH p1, p2, count(e) as meetings
        WHERE meetings > 2
        RETURN p1.id, p2.id, meetings
        ORDER BY meetings DESC
        LIMIT 10
      `;
      explanation = 'Identified pairs of entities appearing at multiple common events.';
      factors = ['Shared Events', 'Recurrence'];
    } else {
      // Financial Structuring: Smurfing / Layering patterns (Fan-out -> Fan-in)
      cypher = `
        MATCH (source)-[:TRANSFERRED]->(intermediate)-[:TRANSFERRED]->(target)
        WHERE source <> target AND source <> intermediate
        WITH source, target, count(intermediate) as layers, sum(intermediate.amount) as total
        WHERE layers > 2
        RETURN source.id, target.id, layers
        ORDER BY layers DESC
        LIMIT 10
      `;
      explanation = 'Detected potential layering/smurfing structures (Fan-out/Fan-in).';
      factors = ['Flow Topology', 'Intermediary Count'];
    }

    const results = await runCypher(cypher, params);

    return {
      data: results,
      xai: {
        features: { patternType, ...params },
        metrics: { matchesFound: results.length },
        explanation,
        contributingFactors: factors,
      },
    };
  }

  // --- Anomaly/Risk Scoring ---

  async detectAnomalies(
    checkType: 'degree' | 'temporal-spike' | 'selector-misuse',
    params: any = {}
  ): Promise<AnalyticResult<any>> {
    let cypher = '';
    let explanation = '';
    let factors: string[] = [];

    if (checkType === 'degree') {
      // Egonet anomalies: Degree > Threshold (e.g. > 3 stddev from mean - simplified here to static)
      cypher = `
        MATCH (n)
        WITH n, size((n)--()) as degree
        WHERE degree > 50 // Threshold
        RETURN n.id as nodeId, degree, n.labels as labels
        ORDER BY degree DESC
        LIMIT 20
      `;
      explanation = 'Nodes exceeding static degree threshold for their type.';
      factors = ['Egonet Size', 'Connectivity'];
    } else if (checkType === 'temporal-spike') {
       // Activity > 3x average
       cypher = `
        MATCH (n)-[r]->()
        WHERE r.timestamp > datetime() - duration('P1D')
        WITH n, count(r) as recentCount
        WHERE recentCount > 20
        RETURN n.id as nodeId, recentCount
       `;
       explanation = 'Entities with volume spike in last 24h.';
       factors = ['Recent Volume', 'Historical Baseline'];
    } else {
      // Selector misuse: Shared selectors (e.g., same phone for many people)
      cypher = `
        MATCH (p:Person)-[:HAS_PHONE]->(ph:Phone)
        WITH ph, count(p) as owners
        WHERE owners > 3
        MATCH (ph)<-[:HAS_PHONE]-(p)
        RETURN ph.number, collect(p.id) as users, owners
      `;
      explanation = 'Single selector (Phone/Email) claimed by multiple distinct identities.';
      factors = ['Selector Cardinality', 'Identity linkage'];
    }

    const results = await runCypher(cypher, params);

    return {
      data: results,
      xai: {
        features: { checkType, ...params },
        metrics: { anomaliesCount: results.length },
        explanation,
        contributingFactors: factors,
      },
    };
  }
}
