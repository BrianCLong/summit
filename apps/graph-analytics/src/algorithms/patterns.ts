import {
  Graph,
  PatternInstance,
  PatternMineResult,
  StarPatternParams,
  BipartitePatternParams,
  RepeatedInteractionParams,
  PatternMinerParams,
} from '../types/analytics';
import { logger } from '../utils/logger';

/**
 * Pattern/Motif Detection Algorithms
 *
 * Detects structural patterns including stars, bipartite structures,
 * and repeated interactions
 */

/**
 * Detect star patterns (central node with many connections)
 */
export function detectStarPatterns(
  graph: Graph,
  params: StarPatternParams,
): PatternInstance[] {
  logger.debug('Detecting star patterns', params);

  const patterns: PatternInstance[] = [];
  const minDegree = params.minDegree || 5;

  // Count degrees for each node
  const degrees = new Map<string, { neighbors: Set<string>; edges: string[] }>();

  for (const node of graph.nodes) {
    degrees.set(node.id, { neighbors: new Set(), edges: [] });
  }

  for (const edge of graph.edges) {
    // Apply edge type filter
    if (params.edgeTypes && !params.edgeTypes.includes(edge.type)) {
      continue;
    }

    const fromInfo = degrees.get(edge.fromId);
    const toInfo = degrees.get(edge.toId);

    if (fromInfo) {
      fromInfo.neighbors.add(edge.toId);
      fromInfo.edges.push(edge.id);
    }
    if (toInfo) {
      toInfo.neighbors.add(edge.fromId);
      toInfo.edges.push(edge.id);
    }
  }

  // Find nodes with degree >= minDegree
  for (const node of graph.nodes) {
    // Apply node label filter
    if (params.nodeLabels && !node.labels.some((l) => params.nodeLabels!.includes(l))) {
      continue;
    }

    const info = degrees.get(node.id);
    if (!info) continue;

    const degree = info.neighbors.size;

    if (degree >= minDegree) {
      patterns.push({
        patternType: 'STAR',
        nodes: [node.id, ...Array.from(info.neighbors)],
        edges: info.edges,
        metrics: {
          degree,
          centralityScore: degree / graph.nodes.length,
        },
        summary: `Node ${node.id} has degree ${degree} and appears as a central hub connecting ${degree} other nodes.`,
      });
    }
  }

  logger.debug(`Found ${patterns.length} star patterns`);
  return patterns;
}

/**
 * Detect bipartite fan-in/fan-out patterns
 */
export function detectBipartiteFanPatterns(
  graph: Graph,
  params: BipartitePatternParams,
): PatternInstance[] {
  logger.debug('Detecting bipartite fan patterns', params);

  const patterns: PatternInstance[] = [];
  const minSources = params.minSources || 3;
  const minTargets = params.minTargets || 2;

  // For each node, track incoming and outgoing connections
  const incomingMap = new Map<
    string,
    { sources: Set<string>; edges: string[] }
  >();
  const outgoingMap = new Map<
    string,
    { targets: Set<string>; edges: string[] }
  >();

  for (const node of graph.nodes) {
    incomingMap.set(node.id, { sources: new Set(), edges: [] });
    outgoingMap.set(node.id, { targets: new Set(), edges: [] });
  }

  for (const edge of graph.edges) {
    // Apply edge type filter
    if (params.edgeTypeFilter && edge.type !== params.edgeTypeFilter) {
      continue;
    }

    const incoming = incomingMap.get(edge.toId);
    const outgoing = outgoingMap.get(edge.fromId);

    if (incoming) {
      incoming.sources.add(edge.fromId);
      incoming.edges.push(edge.id);
    }
    if (outgoing) {
      outgoing.targets.add(edge.toId);
      outgoing.edges.push(edge.id);
    }
  }

  // Check each node as potential intermediate
  for (const node of graph.nodes) {
    const incoming = incomingMap.get(node.id);
    const outgoing = outgoingMap.get(node.id);

    if (!incoming || !outgoing) continue;

    // Fan-out pattern: many sources -> one intermediate -> many targets
    if (
      incoming.sources.size >= minSources &&
      outgoing.targets.size >= minTargets
    ) {
      // Apply label filters
      const sourceNodes = Array.from(incoming.sources);
      const targetNodes = Array.from(outgoing.targets);

      if (params.sourceLabels) {
        const validSources = sourceNodes.filter((srcId) => {
          const srcNode = graph.nodes.find((n) => n.id === srcId);
          return srcNode?.labels.some((l) => params.sourceLabels!.includes(l));
        });
        if (validSources.length < minSources) continue;
      }

      if (params.targetLabels) {
        const validTargets = targetNodes.filter((tgtId) => {
          const tgtNode = graph.nodes.find((n) => n.id === tgtId);
          return tgtNode?.labels.some((l) => params.targetLabels!.includes(l));
        });
        if (validTargets.length < minTargets) continue;
      }

      patterns.push({
        patternType: 'BIPARTITE_FAN',
        nodes: [node.id, ...sourceNodes, ...targetNodes],
        edges: [...incoming.edges, ...outgoing.edges],
        metrics: {
          sources: incoming.sources.size,
          targets: outgoing.targets.size,
          fanInOutRatio:
            outgoing.targets.size / incoming.sources.size,
        },
        summary: `Node ${node.id} acts as intermediary with ${incoming.sources.size} sources fanning in and ${outgoing.targets.size} targets fanning out, suggesting potential structuring or aggregation.`,
      });
    }
  }

  logger.debug(`Found ${patterns.length} bipartite fan patterns`);
  return patterns;
}

/**
 * Detect repeated interaction patterns
 */
export function detectRepeatedInteractions(
  graph: Graph,
  params: RepeatedInteractionParams,
): PatternInstance[] {
  logger.debug('Detecting repeated interaction patterns', params);

  const patterns: PatternInstance[] = [];
  const minInteractions = params.minInteractions || 3;
  const minParticipants = params.minParticipants || 2;

  // Group edges by node pairs
  const pairInteractions = new Map<
    string,
    { edges: string[]; timestamps: number[]; participants: Set<string> }
  >();

  for (const edge of graph.edges) {
    // Apply edge type filter
    if (params.edgeTypes && !params.edgeTypes.includes(edge.type)) {
      continue;
    }

    // Create pair key (sorted to treat as undirected)
    const pairKey = [edge.fromId, edge.toId].sort().join('<->');

    if (!pairInteractions.has(pairKey)) {
      pairInteractions.set(pairKey, {
        edges: [],
        timestamps: [],
        participants: new Set([edge.fromId, edge.toId]),
      });
    }

    const pairInfo = pairInteractions.get(pairKey)!;
    pairInfo.edges.push(edge.id);
    pairInfo.participants.add(edge.fromId);
    pairInfo.participants.add(edge.toId);

    // Extract timestamp if available
    if (edge.properties?.timestamp) {
      const timestamp =
        typeof edge.properties.timestamp === 'number'
          ? edge.properties.timestamp
          : new Date(edge.properties.timestamp).getTime();
      pairInfo.timestamps.push(timestamp);
    }
  }

  // Find pairs with repeated interactions
  for (const [pairKey, info] of pairInteractions.entries()) {
    const interactionCount = info.edges.length;
    const participantCount = info.participants.size;

    if (
      interactionCount >= minInteractions &&
      participantCount >= minParticipants
    ) {
      // Check if within time window (if specified)
      if (params.timeWindowSeconds && info.timestamps.length > 0) {
        const sortedTimestamps = info.timestamps.sort((a, b) => a - b);
        const timeSpan =
          (sortedTimestamps[sortedTimestamps.length - 1] -
            sortedTimestamps[0]) /
          1000;

        if (timeSpan > params.timeWindowSeconds) {
          continue; // Skip if interactions span too long
        }
      }

      const [node1, node2] = pairKey.split('<->');

      patterns.push({
        patternType: 'REPEATED_INTERACTION',
        nodes: Array.from(info.participants),
        edges: info.edges,
        metrics: {
          interactions: interactionCount,
          participants: participantCount,
          frequency: info.timestamps.length > 0
            ? interactionCount /
              ((info.timestamps[info.timestamps.length - 1] -
                info.timestamps[0]) /
                (1000 * 60 * 60 * 24) || 1) // per day
            : undefined,
        },
        summary: `Repeated interaction pattern between ${participantCount} participants with ${interactionCount} total interactions, indicating potential coordination or recurring relationship.`,
      });
    }
  }

  logger.debug(`Found ${patterns.length} repeated interaction patterns`);
  return patterns;
}

/**
 * Run pattern miner with multiple pattern types
 */
export function runPatternMiner(
  graph: Graph,
  params: PatternMinerParams,
): PatternMineResult {
  logger.info('Running pattern miner', { graph: graph.nodes.length });

  const allPatterns: PatternInstance[] = [];

  // Detect star patterns
  if (params.star) {
    const starPatterns = detectStarPatterns(graph, params.star);
    allPatterns.push(...starPatterns);
  }

  // Detect bipartite fan patterns
  if (params.bipartiteFan) {
    const fanPatterns = detectBipartiteFanPatterns(graph, params.bipartiteFan);
    allPatterns.push(...fanPatterns);
  }

  // Detect repeated interaction patterns
  if (params.repeatedInteractions) {
    const repeatedPatterns = detectRepeatedInteractions(
      graph,
      params.repeatedInteractions,
    );
    allPatterns.push(...repeatedPatterns);
  }

  logger.info(`Pattern mining completed, found ${allPatterns.length} patterns`);

  return {
    patterns: allPatterns,
  };
}

/**
 * Find triangle patterns (3-node cliques)
 */
export function detectTriangles(graph: Graph): PatternInstance[] {
  const patterns: PatternInstance[] = [];
  const adjacency = new Map<string, Set<string>>();

  // Build adjacency list
  for (const node of graph.nodes) {
    adjacency.set(node.id, new Set());
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.fromId)?.add(edge.toId);
    adjacency.get(edge.toId)?.add(edge.fromId);
  }

  // Find triangles
  const nodeIds = graph.nodes.map((n) => n.id);
  const found = new Set<string>();

  for (let i = 0; i < nodeIds.length; i++) {
    const a = nodeIds[i];
    const neighborsA = adjacency.get(a);
    if (!neighborsA) continue;

    for (let j = i + 1; j < nodeIds.length; j++) {
      const b = nodeIds[j];
      if (!neighborsA.has(b)) continue;

      const neighborsB = adjacency.get(b);
      if (!neighborsB) continue;

      for (let k = j + 1; k < nodeIds.length; k++) {
        const c = nodeIds[k];
        if (neighborsA.has(c) && neighborsB.has(c)) {
          const key = [a, b, c].sort().join('-');
          if (!found.has(key)) {
            found.add(key);
            patterns.push({
              patternType: 'TRIANGLE',
              nodes: [a, b, c],
              edges: [],
              summary: `Triangle pattern formed by nodes ${a}, ${b}, and ${c}, indicating high local clustering.`,
            });
          }
        }
      }
    }
  }

  return patterns;
}
