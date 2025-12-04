/**
 * Pattern Mining Templates for Intelligence Analysis
 *
 * Implements parameterized pattern detection for:
 * - Co-travel/co-presence (spacetime patterns)
 * - Financial structuring (fan-in/fan-out patterns)
 * - Communication bursts and lulls
 *
 * All patterns include XAI-friendly explanations and policy awareness.
 *
 * @module pattern-mining/pattern-templates
 */

export interface GraphData {
  nodes: Array<{
    id: string;
    type?: string;
    properties?: Record<string, any>;
    location?: { lat: number; lon: number };
    timestamp?: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type?: string;
    weight?: number;
    properties?: Record<string, any>;
    timestamp?: number;
  }>;
}

export interface PatternExplanation {
  /**
   * Element ID (node, edge, or pattern instance ID)
   */
  elementId: string;

  /**
   * Element type
   */
  elementType: 'node' | 'edge' | 'pattern';

  /**
   * Importance/anomaly score (0-1)
   */
  importanceScore: number;

  /**
   * Human-readable reasoning
   */
  reasoning: string;

  /**
   * Evidence supporting the pattern
   */
  evidence: string[];

  /**
   * Uncertainty in detection (0-1)
   */
  uncertainty: number;

  /**
   * Feature importances for XAI
   */
  featureImportances?: Record<string, number>;
}

export interface PatternMatch {
  /**
   * Pattern instance ID
   */
  id: string;

  /**
   * Nodes involved in the pattern
   */
  nodes: string[];

  /**
   * Edges involved in the pattern
   */
  edges: Array<{ source: string; target: string }>;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Pattern-specific metadata
   */
  metadata: Record<string, any>;

  /**
   * XAI explanations
   */
  explanations: PatternExplanation[];
}

export interface CoTravelOptions {
  /**
   * Time window for co-presence (milliseconds)
   */
  timeWindow: number;

  /**
   * Spatial distance threshold (meters)
   */
  distanceThreshold: number;

  /**
   * Minimum number of co-occurrences
   */
  minCoOccurrences: number;

  /**
   * Entity types to consider (empty = all)
   */
  entityTypes?: string[];

  /**
   * Start time for analysis
   */
  startTime?: number;

  /**
   * End time for analysis
   */
  endTime?: number;
}

export interface CoTravelResult {
  /**
   * Detected co-travel patterns
   */
  patterns: PatternMatch[];

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Metadata about the analysis
   */
  metadata: {
    nodesAnalyzed: number;
    timeRange: { start: number; end: number };
    parameters: CoTravelOptions;
  };
}

export interface FinancialStructuringOptions {
  /**
   * Time window for pattern detection (milliseconds)
   */
  timeWindow: number;

  /**
   * Minimum number of branches in fan-in/fan-out
   */
  minBranches: number;

  /**
   * Maximum number of hops from center
   */
  maxHops: number;

  /**
   * Transaction amount threshold (if applicable)
   */
  amountThreshold?: number;

  /**
   * Pattern type to detect
   */
  patternType: 'fan-in' | 'fan-out' | 'both';

  /**
   * Entity types for center nodes
   */
  centerNodeTypes?: string[];
}

export interface FinancialStructuringResult {
  /**
   * Detected structuring patterns
   */
  patterns: PatternMatch[];

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Metadata about the analysis
   */
  metadata: {
    nodesAnalyzed: number;
    edgesAnalyzed: number;
    parameters: FinancialStructuringOptions;
  };
}

export interface CommunicationBurstOptions {
  /**
   * Time window for burst detection (milliseconds)
   */
  timeWindow: number;

  /**
   * Baseline communication rate (messages per time unit)
   */
  baselineRate?: number;

  /**
   * Burst threshold (multiplier of baseline)
   */
  burstThreshold: number;

  /**
   * Lull threshold (fraction of baseline)
   */
  lullThreshold?: number;

  /**
   * Communication types to analyze (empty = all)
   */
  communicationTypes?: string[];

  /**
   * Minimum burst duration (milliseconds)
   */
  minBurstDuration?: number;
}

export interface CommunicationBurstResult {
  /**
   * Detected bursts
   */
  bursts: PatternMatch[];

  /**
   * Detected lulls
   */
  lulls: PatternMatch[];

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Metadata about the analysis
   */
  metadata: {
    edgesAnalyzed: number;
    baselineRate: number;
    parameters: CommunicationBurstOptions;
  };
}

/**
 * Detect co-travel/co-presence patterns in spacetime
 */
export function detectCoTravelPatterns(
  graph: GraphData,
  options: CoTravelOptions,
): CoTravelResult {
  const startTime = performance.now();

  const {
    timeWindow,
    distanceThreshold,
    minCoOccurrences,
    entityTypes,
    startTime: analysisStart,
    endTime: analysisEnd,
  } = options;

  // Filter nodes by entity type and time range
  let nodes = graph.nodes.filter((n) => {
    if (entityTypes && entityTypes.length > 0) {
      if (!entityTypes.includes(n.type || '')) return false;
    }
    if (analysisStart !== undefined && n.timestamp !== undefined) {
      if (n.timestamp < analysisStart) return false;
    }
    if (analysisEnd !== undefined && n.timestamp !== undefined) {
      if (n.timestamp > analysisEnd) return false;
    }
    return n.location !== undefined && n.timestamp !== undefined;
  });

  const patterns: PatternMatch[] = [];
  const coOccurrences = new Map<string, number>();
  const coOccurrenceEvents = new Map<
    string,
    Array<{ time: number; location: { lat: number; lon: number } }>
  >();

  // Find co-presence events
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];

      if (!node1.location || !node2.location || !node1.timestamp || !node2.timestamp) {
        continue;
      }

      const timeDiff = Math.abs(node1.timestamp - node2.timestamp);
      const distance = calculateDistance(node1.location, node2.location);

      if (timeDiff <= timeWindow && distance <= distanceThreshold) {
        const pairKey =
          node1.id < node2.id ? `${node1.id}|${node2.id}` : `${node2.id}|${node1.id}`;
        coOccurrences.set(pairKey, (coOccurrences.get(pairKey) || 0) + 1);

        if (!coOccurrenceEvents.has(pairKey)) {
          coOccurrenceEvents.set(pairKey, []);
        }
        coOccurrenceEvents.get(pairKey)!.push({
          time: Math.min(node1.timestamp, node2.timestamp),
          location: node1.location,
        });
      }
    }
  }

  // Filter by minimum co-occurrences and create patterns
  let patternId = 0;
  for (const [pairKey, count] of coOccurrences.entries()) {
    if (count >= minCoOccurrences) {
      const [node1Id, node2Id] = pairKey.split('|');
      const events = coOccurrenceEvents.get(pairKey) || [];

      const node1 = nodes.find((n) => n.id === node1Id);
      const node2 = nodes.find((n) => n.id === node2Id);

      if (!node1 || !node2) continue;

      const confidence = Math.min(1.0, count / (minCoOccurrences * 2));

      const explanations: PatternExplanation[] = [
        {
          elementId: `cotravel-${patternId}`,
          elementType: 'pattern',
          importanceScore: confidence,
          reasoning: `Co-travel pattern detected: ${node1Id} and ${node2Id} were co-located ${count} times within ${timeWindow / 1000}s and ${distanceThreshold}m`,
          evidence: [
            `Co-occurrences: ${count}`,
            `Time window: ${timeWindow / 1000}s`,
            `Distance threshold: ${distanceThreshold}m`,
            `First event: ${new Date(events[0]?.time || 0).toISOString()}`,
            `Last event: ${new Date(events[events.length - 1]?.time || 0).toISOString()}`,
          ],
          uncertainty: 0.1 + (1 / count) * 0.2,
          featureImportances: {
            temporal_proximity: 0.4,
            spatial_proximity: 0.4,
            frequency: 0.2,
          },
        },
        {
          elementId: node1Id,
          elementType: 'node',
          importanceScore: 0.8,
          reasoning: `Entity ${node1Id} participated in ${count} co-location events`,
          evidence: [
            `Node type: ${node1.type || 'Unknown'}`,
            `Co-travel events: ${count}`,
          ],
          uncertainty: 0.1,
          featureImportances: {
            participation_count: 1.0,
          },
        },
        {
          elementId: node2Id,
          elementType: 'node',
          importanceScore: 0.8,
          reasoning: `Entity ${node2Id} participated in ${count} co-location events`,
          evidence: [
            `Node type: ${node2.type || 'Unknown'}`,
            `Co-travel events: ${count}`,
          ],
          uncertainty: 0.1,
          featureImportances: {
            participation_count: 1.0,
          },
        },
      ];

      patterns.push({
        id: `cotravel-${patternId++}`,
        nodes: [node1Id, node2Id],
        edges: [],
        confidence,
        metadata: {
          coOccurrences: count,
          events,
          avgDistance:
            events.reduce((sum, e) => sum + calculateDistance(e.location, node2.location!), 0) /
            events.length,
          timeSpan: events.length > 0 ? events[events.length - 1].time - events[0].time : 0,
        },
        explanations,
      });
    }
  }

  const executionTime = performance.now() - startTime;

  return {
    patterns,
    executionTime,
    metadata: {
      nodesAnalyzed: nodes.length,
      timeRange: {
        start: analysisStart ?? Math.min(...nodes.map((n) => n.timestamp ?? Infinity)),
        end: analysisEnd ?? Math.max(...nodes.map((n) => n.timestamp ?? -Infinity)),
      },
      parameters: options,
    },
  };
}

/**
 * Detect financial structuring patterns (fan-in/fan-out)
 */
export function detectFinancialStructuring(
  graph: GraphData,
  options: FinancialStructuringOptions,
): FinancialStructuringResult {
  const startTime = performance.now();

  const {
    timeWindow,
    minBranches,
    maxHops,
    amountThreshold,
    patternType,
    centerNodeTypes,
  } = options;

  const patterns: PatternMatch[] = [];

  // Build temporal adjacency list
  const outgoing = new Map<string, Array<{ target: string; timestamp: number; amount?: number }>>();
  const incoming = new Map<string, Array<{ source: string; timestamp: number; amount?: number }>>();

  for (const node of graph.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.timestamp === undefined) continue;

    const amount = edge.properties?.amount;
    if (amountThreshold !== undefined && amount !== undefined) {
      if (amount < amountThreshold) continue;
    }

    outgoing.get(edge.source)?.push({
      target: edge.target,
      timestamp: edge.timestamp,
      amount,
    });
    incoming.get(edge.target)?.push({
      source: edge.source,
      timestamp: edge.timestamp,
      amount,
    });
  }

  let patternId = 0;

  // Detect fan-out patterns
  if (patternType === 'fan-out' || patternType === 'both') {
    for (const node of graph.nodes) {
      if (centerNodeTypes && centerNodeTypes.length > 0) {
        if (!centerNodeTypes.includes(node.type || '')) continue;
      }

      const outgoingEdges = outgoing.get(node.id) || [];

      // Group by time windows
      const windowGroups = groupByTimeWindow(outgoingEdges, timeWindow);

      for (const group of windowGroups) {
        if (group.edges.length >= minBranches) {
          const confidence = Math.min(1.0, group.edges.length / (minBranches * 2));
          const totalAmount = group.edges.reduce((sum, e) => sum + (e.amount || 0), 0);
          const avgAmount = totalAmount / group.edges.length;

          const explanations: PatternExplanation[] = [
            {
              elementId: `fan-out-${patternId}`,
              elementType: 'pattern',
              importanceScore: confidence,
              reasoning: `Fan-out structuring pattern: ${node.id} distributed to ${group.edges.length} entities within ${timeWindow / 1000}s`,
              evidence: [
                `Center node: ${node.id} (${node.type || 'Unknown'})`,
                `Branches: ${group.edges.length}`,
                `Time window: ${timeWindow / 1000}s`,
                `Total amount: ${totalAmount.toFixed(2)}`,
                `Average amount: ${avgAmount.toFixed(2)}`,
                `Time range: ${new Date(group.startTime).toISOString()} - ${new Date(group.endTime).toISOString()}`,
              ],
              uncertainty: 0.15,
              featureImportances: {
                branch_count: 0.4,
                temporal_concentration: 0.3,
                amount_distribution: 0.3,
              },
            },
            {
              elementId: node.id,
              elementType: 'node',
              importanceScore: 0.9,
              reasoning: `Center of fan-out pattern with ${group.edges.length} branches`,
              evidence: [
                `Node type: ${node.type || 'Unknown'}`,
                `Outgoing branches: ${group.edges.length}`,
              ],
              uncertainty: 0.1,
              featureImportances: {
                centrality: 1.0,
              },
            },
          ];

          patterns.push({
            id: `fan-out-${patternId++}`,
            nodes: [node.id, ...group.edges.map((e) => e.target)],
            edges: group.edges.map((e) => ({ source: node.id, target: e.target })),
            confidence,
            metadata: {
              patternType: 'fan-out',
              centerNode: node.id,
              branches: group.edges.length,
              totalAmount,
              avgAmount,
              timeWindow: { start: group.startTime, end: group.endTime },
            },
            explanations,
          });
        }
      }
    }
  }

  // Detect fan-in patterns
  if (patternType === 'fan-in' || patternType === 'both') {
    for (const node of graph.nodes) {
      if (centerNodeTypes && centerNodeTypes.length > 0) {
        if (!centerNodeTypes.includes(node.type || '')) continue;
      }

      const incomingEdges = incoming.get(node.id) || [];

      // Group by time windows
      const windowGroups = groupByTimeWindow(incomingEdges, timeWindow);

      for (const group of windowGroups) {
        if (group.edges.length >= minBranches) {
          const confidence = Math.min(1.0, group.edges.length / (minBranches * 2));
          const totalAmount = group.edges.reduce((sum, e) => sum + (e.amount || 0), 0);
          const avgAmount = totalAmount / group.edges.length;

          const explanations: PatternExplanation[] = [
            {
              elementId: `fan-in-${patternId}`,
              elementType: 'pattern',
              importanceScore: confidence,
              reasoning: `Fan-in structuring pattern: ${group.edges.length} entities converged to ${node.id} within ${timeWindow / 1000}s`,
              evidence: [
                `Center node: ${node.id} (${node.type || 'Unknown'})`,
                `Branches: ${group.edges.length}`,
                `Time window: ${timeWindow / 1000}s`,
                `Total amount: ${totalAmount.toFixed(2)}`,
                `Average amount: ${avgAmount.toFixed(2)}`,
                `Time range: ${new Date(group.startTime).toISOString()} - ${new Date(group.endTime).toISOString()}`,
              ],
              uncertainty: 0.15,
              featureImportances: {
                branch_count: 0.4,
                temporal_concentration: 0.3,
                amount_distribution: 0.3,
              },
            },
            {
              elementId: node.id,
              elementType: 'node',
              importanceScore: 0.9,
              reasoning: `Center of fan-in pattern with ${group.edges.length} branches`,
              evidence: [
                `Node type: ${node.type || 'Unknown'}`,
                `Incoming branches: ${group.edges.length}`,
              ],
              uncertainty: 0.1,
              featureImportances: {
                centrality: 1.0,
              },
            },
          ];

          patterns.push({
            id: `fan-in-${patternId++}`,
            nodes: [...group.edges.map((e) => (e as any).source), node.id],
            edges: group.edges.map((e) => ({ source: (e as any).source, target: node.id })),
            confidence,
            metadata: {
              patternType: 'fan-in',
              centerNode: node.id,
              branches: group.edges.length,
              totalAmount,
              avgAmount,
              timeWindow: { start: group.startTime, end: group.endTime },
            },
            explanations,
          });
        }
      }
    }
  }

  const executionTime = performance.now() - startTime;

  return {
    patterns,
    executionTime,
    metadata: {
      nodesAnalyzed: graph.nodes.length,
      edgesAnalyzed: graph.edges.filter((e) => e.timestamp !== undefined).length,
      parameters: options,
    },
  };
}

/**
 * Detect communication bursts and lulls
 */
export function detectCommunicationBursts(
  graph: GraphData,
  options: CommunicationBurstOptions,
): CommunicationBurstResult {
  const startTime = performance.now();

  const {
    timeWindow,
    baselineRate,
    burstThreshold,
    lullThreshold = 0.3,
    communicationTypes,
    minBurstDuration = 0,
  } = options;

  // Filter edges by communication type
  let edges = graph.edges.filter((e) => e.timestamp !== undefined);

  if (communicationTypes && communicationTypes.length > 0) {
    edges = edges.filter((e) => communicationTypes.includes(e.type || ''));
  }

  // Sort edges by timestamp
  edges.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  if (edges.length === 0) {
    return {
      bursts: [],
      lulls: [],
      executionTime: performance.now() - startTime,
      metadata: {
        edgesAnalyzed: 0,
        baselineRate: 0,
        parameters: options,
      },
    };
  }

  // Calculate baseline rate if not provided
  const timeSpan = (edges[edges.length - 1].timestamp || 0) - (edges[0].timestamp || 0);
  const calculatedBaselineRate = baselineRate ?? edges.length / (timeSpan / timeWindow);

  // Sliding window analysis
  const bursts: PatternMatch[] = [];
  const lulls: PatternMatch[] = [];

  let windowStart = edges[0].timestamp || 0;
  let windowEnd = windowStart + timeWindow;
  let windowIndex = 0;
  let burstId = 0;
  let lullId = 0;

  while (windowStart <= (edges[edges.length - 1].timestamp || 0)) {
    const windowEdges = edges.filter(
      (e) => (e.timestamp || 0) >= windowStart && (e.timestamp || 0) < windowEnd,
    );

    const windowRate = windowEdges.length;

    // Check for burst
    if (windowRate >= calculatedBaselineRate * burstThreshold) {
      const confidence = Math.min(1.0, windowRate / (calculatedBaselineRate * burstThreshold * 2));

      // Group involved nodes
      const involvedNodes = new Set<string>();
      windowEdges.forEach((e) => {
        involvedNodes.add(e.source);
        involvedNodes.add(e.target);
      });

      const explanations: PatternExplanation[] = [
        {
          elementId: `burst-${burstId}`,
          elementType: 'pattern',
          importanceScore: confidence,
          reasoning: `Communication burst detected: ${windowRate} messages (${(windowRate / calculatedBaselineRate).toFixed(1)}x baseline) in ${timeWindow / 1000}s`,
          evidence: [
            `Message count: ${windowRate}`,
            `Baseline rate: ${calculatedBaselineRate.toFixed(2)}`,
            `Burst ratio: ${(windowRate / calculatedBaselineRate).toFixed(2)}x`,
            `Time window: ${new Date(windowStart).toISOString()} - ${new Date(windowEnd).toISOString()}`,
            `Involved entities: ${involvedNodes.size}`,
          ],
          uncertainty: 0.1,
          featureImportances: {
            message_rate: 0.5,
            deviation_from_baseline: 0.3,
            entity_count: 0.2,
          },
        },
      ];

      bursts.push({
        id: `burst-${burstId++}`,
        nodes: Array.from(involvedNodes),
        edges: windowEdges.map((e) => ({ source: e.source, target: e.target })),
        confidence,
        metadata: {
          messageCount: windowRate,
          baselineRate: calculatedBaselineRate,
          burstRatio: windowRate / calculatedBaselineRate,
          timeWindow: { start: windowStart, end: windowEnd },
          duration: windowEnd - windowStart,
        },
        explanations,
      });
    }

    // Check for lull
    if (windowRate < calculatedBaselineRate * lullThreshold) {
      const confidence = Math.min(
        1.0,
        (calculatedBaselineRate * lullThreshold - windowRate) / calculatedBaselineRate,
      );

      const involvedNodes = new Set<string>();
      windowEdges.forEach((e) => {
        involvedNodes.add(e.source);
        involvedNodes.add(e.target);
      });

      const explanations: PatternExplanation[] = [
        {
          elementId: `lull-${lullId}`,
          elementType: 'pattern',
          importanceScore: confidence,
          reasoning: `Communication lull detected: ${windowRate} messages (${(windowRate / calculatedBaselineRate).toFixed(1)}x baseline) in ${timeWindow / 1000}s`,
          evidence: [
            `Message count: ${windowRate}`,
            `Baseline rate: ${calculatedBaselineRate.toFixed(2)}`,
            `Lull ratio: ${(windowRate / calculatedBaselineRate).toFixed(2)}x`,
            `Time window: ${new Date(windowStart).toISOString()} - ${new Date(windowEnd).toISOString()}`,
          ],
          uncertainty: 0.15,
          featureImportances: {
            message_rate: 0.6,
            deviation_from_baseline: 0.4,
          },
        },
      ];

      lulls.push({
        id: `lull-${lullId++}`,
        nodes: Array.from(involvedNodes),
        edges: windowEdges.map((e) => ({ source: e.source, target: e.target })),
        confidence,
        metadata: {
          messageCount: windowRate,
          baselineRate: calculatedBaselineRate,
          lullRatio: windowRate / calculatedBaselineRate,
          timeWindow: { start: windowStart, end: windowEnd },
          duration: windowEnd - windowStart,
        },
        explanations,
      });
    }

    // Slide window (50% overlap for better detection)
    windowStart += timeWindow / 2;
    windowEnd = windowStart + timeWindow;
    windowIndex++;
  }

  // Filter by minimum duration
  const filteredBursts = bursts.filter(
    (b) => (b.metadata.duration || 0) >= minBurstDuration,
  );

  const executionTime = performance.now() - startTime;

  return {
    bursts: filteredBursts,
    lulls,
    executionTime,
    metadata: {
      edgesAnalyzed: edges.length,
      baselineRate: calculatedBaselineRate,
      parameters: options,
    },
  };
}

// Helper functions

function calculateDistance(
  loc1: { lat: number; lon: number },
  loc2: { lat: number; lon: number },
): number {
  // Haversine formula for distance in meters
  const R = 6371000; // Earth radius in meters
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLon = ((loc2.lon - loc1.lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function groupByTimeWindow<T extends { timestamp: number }>(
  items: T[],
  timeWindow: number,
): Array<{ edges: T[]; startTime: number; endTime: number }> {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
  const groups: Array<{ edges: T[]; startTime: number; endTime: number }> = [];

  let currentGroup: T[] = [sorted[0]];
  let groupStart = sorted[0].timestamp;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];

    if (item.timestamp - groupStart <= timeWindow) {
      currentGroup.push(item);
    } else {
      // Save current group
      groups.push({
        edges: currentGroup,
        startTime: groupStart,
        endTime: currentGroup[currentGroup.length - 1].timestamp,
      });

      // Start new group
      currentGroup = [item];
      groupStart = item.timestamp;
    }
  }

  // Save last group
  if (currentGroup.length > 0) {
    groups.push({
      edges: currentGroup,
      startTime: groupStart,
      endTime: currentGroup[currentGroup.length - 1].timestamp,
    });
  }

  return groups;
}
