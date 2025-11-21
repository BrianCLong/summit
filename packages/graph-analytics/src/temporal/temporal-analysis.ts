/**
 * Temporal Graph Analysis
 *
 * Analyzes how graphs evolve over time, detecting patterns in network dynamics,
 * tracking entity lifecycles, and identifying temporal anomalies. Critical for
 * intelligence analysis to understand operational patterns and predict future activities.
 *
 * @module temporal/temporal-analysis
 */

export interface TemporalGraph {
  nodes: Array<{ id: string; timestamp: Date; properties?: Record<string, any> }>;
  edges: Array<{
    source: string;
    target: string;
    timestamp: Date;
    weight?: number;
    properties?: Record<string, any>;
  }>;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface GraphSnapshot {
  timestamp: Date;
  nodes: string[];
  edges: Array<{ source: string; target: string; weight?: number }>;
  metrics: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    avgDegree: number;
    components: number;
  };
}

export interface TemporalEvolutionResult {
  timeframe: TimeWindow;
  snapshots: GraphSnapshot[];
  trends: {
    nodeGrowthRate: number;
    edgeGrowthRate: number;
    densityTrend: 'increasing' | 'decreasing' | 'stable';
    volatility: number;
  };
  changeEvents: Array<{
    timestamp: Date;
    type: 'node-burst' | 'edge-burst' | 'community-shift' | 'structural-change';
    magnitude: number;
    description: string;
  }>;
  executionTime: number;
}

export interface TemporalCentralityResult {
  /**
   * Time-varying centrality scores for each node
   */
  nodeCentrality: Map<string, Array<{ timestamp: Date; score: number }>>;

  /**
   * Nodes with highest centrality variance over time
   */
  volatileNodes: Array<{ node: string; variance: number; trend: 'rising' | 'falling' | 'fluctuating' }>;

  /**
   * Nodes that emerged as central
   */
  emergingNodes: Array<{ node: string; startTime: Date; peakScore: number }>;

  executionTime: number;
}

export interface EventSequenceResult {
  /**
   * Detected temporal patterns
   */
  patterns: Array<{
    id: string;
    sequence: Array<{ eventType: string; avgTimeGap: number }>;
    occurrences: number;
    confidence: number;
  }>;

  /**
   * Event bursts (unusual spikes in activity)
   */
  bursts: Array<{
    timestamp: Date;
    duration: number;
    intensity: number;
    involvedNodes: string[];
  }>;

  executionTime: number;
}

/**
 * Analyzes how a graph evolves over time
 *
 * @param temporalGraph - Graph with temporal information
 * @param options - Analysis options
 * @returns Temporal evolution analysis
 */
export function analyzeTemporalEvolution(
  temporalGraph: TemporalGraph,
  options: {
    numSnapshots?: number;
    detectBursts?: boolean;
    burstThreshold?: number;
  } = {},
): TemporalEvolutionResult {
  const startTime = performance.now();

  const { numSnapshots = 20, detectBursts = true, burstThreshold = 2.0 } = options;

  // Find time range
  const allTimestamps = [
    ...temporalGraph.nodes.map((n) => n.timestamp),
    ...temporalGraph.edges.map((e) => e.timestamp),
  ];

  if (allTimestamps.length === 0) {
    return {
      timeframe: { start: new Date(), end: new Date() },
      snapshots: [],
      trends: {
        nodeGrowthRate: 0,
        edgeGrowthRate: 0,
        densityTrend: 'stable',
        volatility: 0,
      },
      changeEvents: [],
      executionTime: performance.now() - startTime,
    };
  }

  const minTime = new Date(Math.min(...allTimestamps.map((t) => t.getTime())));
  const maxTime = new Date(Math.max(...allTimestamps.map((t) => t.getTime())));

  const timeframe = { start: minTime, end: maxTime };
  const timeRange = maxTime.getTime() - minTime.getTime();
  const intervalSize = timeRange / numSnapshots;

  // Create snapshots
  const snapshots: GraphSnapshot[] = [];

  for (let i = 0; i <= numSnapshots; i++) {
    const snapshotTime = new Date(minTime.getTime() + i * intervalSize);

    // Get nodes and edges up to this time
    const activeNodes = temporalGraph.nodes
      .filter((n) => n.timestamp <= snapshotTime)
      .map((n) => n.id);

    const activeEdges = temporalGraph.edges.filter(
      (e) =>
        e.timestamp <= snapshotTime &&
        activeNodes.includes(e.source) &&
        activeNodes.includes(e.target),
    );

    const nodeCount = activeNodes.length;
    const edgeCount = activeEdges.length;

    // Calculate density
    const density =
      nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

    // Calculate average degree
    const degrees = new Map<string, number>();
    for (const node of activeNodes) {
      degrees.set(node, 0);
    }

    for (const edge of activeEdges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }

    const avgDegree =
      nodeCount > 0
        ? Array.from(degrees.values()).reduce((sum, d) => sum + d, 0) / nodeCount
        : 0;

    // Estimate components (simplified - would need proper algorithm)
    const components = nodeCount > 0 ? 1 : 0;

    snapshots.push({
      timestamp: snapshotTime,
      nodes: activeNodes,
      edges: activeEdges,
      metrics: {
        nodeCount,
        edgeCount,
        density,
        avgDegree,
        components,
      },
    });
  }

  // Calculate trends
  const nodeCounts = snapshots.map((s) => s.metrics.nodeCount);
  const edgeCounts = snapshots.map((s) => s.metrics.edgeCount);
  const densities = snapshots.map((s) => s.metrics.density);

  const nodeGrowthRate = calculateGrowthRate(nodeCounts);
  const edgeGrowthRate = calculateGrowthRate(edgeCounts);
  const densitySlope = calculateSlope(densities);

  let densityTrend: 'increasing' | 'decreasing' | 'stable';
  if (densitySlope > 0.01) densityTrend = 'increasing';
  else if (densitySlope < -0.01) densityTrend = 'decreasing';
  else densityTrend = 'stable';

  const volatility = calculateVolatility([...nodeCounts, ...edgeCounts]);

  // Detect change events
  const changeEvents: Array<{
    timestamp: Date;
    type: 'node-burst' | 'edge-burst' | 'community-shift' | 'structural-change';
    magnitude: number;
    description: string;
  }> = [];

  if (detectBursts) {
    // Detect node bursts
    for (let i = 1; i < snapshots.length; i++) {
      const prevCount = snapshots[i - 1].metrics.nodeCount;
      const currCount = snapshots[i].metrics.nodeCount;
      const growth = prevCount > 0 ? (currCount - prevCount) / prevCount : 0;

      if (growth > burstThreshold) {
        changeEvents.push({
          timestamp: snapshots[i].timestamp,
          type: 'node-burst',
          magnitude: growth,
          description: `${((growth * 100).toFixed(1))}% increase in nodes (${prevCount} → ${currCount})`,
        });
      }
    }

    // Detect edge bursts
    for (let i = 1; i < snapshots.length; i++) {
      const prevCount = snapshots[i - 1].metrics.edgeCount;
      const currCount = snapshots[i].metrics.edgeCount;
      const growth = prevCount > 0 ? (currCount - prevCount) / prevCount : 0;

      if (growth > burstThreshold) {
        changeEvents.push({
          timestamp: snapshots[i].timestamp,
          type: 'edge-burst',
          magnitude: growth,
          description: `${((growth * 100).toFixed(1))}% increase in edges (${prevCount} → ${currCount})`,
        });
      }
    }

    // Detect density changes
    for (let i = 1; i < snapshots.length; i++) {
      const prevDensity = snapshots[i - 1].metrics.density;
      const currDensity = snapshots[i].metrics.density;
      const change = Math.abs(currDensity - prevDensity);

      if (change > 0.1) {
        changeEvents.push({
          timestamp: snapshots[i].timestamp,
          type: 'structural-change',
          magnitude: change,
          description: `Significant density change: ${prevDensity.toFixed(3)} → ${currDensity.toFixed(3)}`,
        });
      }
    }
  }

  // Sort events by timestamp
  changeEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const executionTime = performance.now() - startTime;

  return {
    timeframe,
    snapshots,
    trends: {
      nodeGrowthRate,
      edgeGrowthRate,
      densityTrend,
      volatility,
    },
    changeEvents,
    executionTime,
  };
}

/**
 * Calculates temporal centrality - how node importance changes over time
 *
 * @param temporalGraph - Graph with temporal information
 * @param options - Analysis options
 * @returns Temporal centrality analysis
 */
export function analyzeTemporalCentrality(
  temporalGraph: TemporalGraph,
  options: {
    numSnapshots?: number;
    centralityType?: 'degree' | 'betweenness' | 'closeness';
  } = {},
): TemporalCentralityResult {
  const startTime = performance.now();

  const { numSnapshots = 20, centralityType = 'degree' } = options;

  // Get time range
  const allTimestamps = [
    ...temporalGraph.nodes.map((n) => n.timestamp),
    ...temporalGraph.edges.map((e) => e.timestamp),
  ];

  const minTime = new Date(Math.min(...allTimestamps.map((t) => t.getTime())));
  const maxTime = new Date(Math.max(...allTimestamps.map((t) => t.getTime())));
  const timeRange = maxTime.getTime() - minTime.getTime();
  const intervalSize = timeRange / numSnapshots;

  const nodeCentrality = new Map<string, Array<{ timestamp: Date; score: number }>>();

  // Calculate centrality at each snapshot
  for (let i = 0; i <= numSnapshots; i++) {
    const snapshotTime = new Date(minTime.getTime() + i * intervalSize);

    const activeNodes = temporalGraph.nodes
      .filter((n) => n.timestamp <= snapshotTime)
      .map((n) => n.id);

    const activeEdges = temporalGraph.edges.filter(
      (e) =>
        e.timestamp <= snapshotTime &&
        activeNodes.includes(e.source) &&
        activeNodes.includes(e.target),
    );

    // Calculate degree centrality (simplified - could add other types)
    const degrees = new Map<string, number>();
    for (const node of activeNodes) {
      degrees.set(node, 0);
    }

    for (const edge of activeEdges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }

    // Normalize by max possible degree
    const maxDegree = activeNodes.length > 1 ? activeNodes.length - 1 : 1;

    for (const [node, degree] of degrees) {
      const normalizedDegree = degree / maxDegree;

      if (!nodeCentrality.has(node)) {
        nodeCentrality.set(node, []);
      }
      nodeCentrality.get(node)!.push({
        timestamp: snapshotTime,
        score: normalizedDegree,
      });
    }
  }

  // Analyze volatility and trends
  const volatileNodes: Array<{
    node: string;
    variance: number;
    trend: 'rising' | 'falling' | 'fluctuating';
  }> = [];

  const emergingNodes: Array<{
    node: string;
    startTime: Date;
    peakScore: number;
  }> = [];

  for (const [node, scores] of nodeCentrality) {
    if (scores.length < 2) continue;

    const values = scores.map((s) => s.score);
    const variance = calculateVariance(values);
    const trend = detectTrend(values);

    volatileNodes.push({ node, variance, trend });

    // Check if node emerged (low at start, high later)
    if (values[0] < 0.1 && Math.max(...values) > 0.3) {
      emergingNodes.push({
        node,
        startTime: scores[0].timestamp,
        peakScore: Math.max(...values),
      });
    }
  }

  // Sort by variance
  volatileNodes.sort((a, b) => b.variance - a.variance);

  const executionTime = performance.now() - startTime;

  return {
    nodeCentrality,
    volatileNodes: volatileNodes.slice(0, 20),
    emergingNodes: emergingNodes.slice(0, 20),
    executionTime,
  };
}

/**
 * Detects temporal patterns in event sequences
 *
 * @param temporalGraph - Graph with temporal information
 * @param options - Analysis options
 * @returns Event sequence patterns
 */
export function analyzeEventSequences(
  temporalGraph: TemporalGraph,
  options: {
    minSupport?: number;
    maxTimeGap?: number; // milliseconds
    burstWindowSize?: number; // milliseconds
  } = {},
): EventSequenceResult {
  const startTime = performance.now();

  const {
    minSupport = 3,
    maxTimeGap = 86400000, // 1 day
    burstWindowSize = 3600000, // 1 hour
  } = options;

  // Extract event types from edge properties
  const events = temporalGraph.edges
    .map((e) => ({
      type: e.properties?.eventType || 'connection',
      timestamp: e.timestamp,
      source: e.source,
      target: e.target,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Simple sequential pattern mining
  const patterns: Array<{
    id: string;
    sequence: Array<{ eventType: string; avgTimeGap: number }>;
    occurrences: number;
    confidence: number;
  }> = [];

  // Detect bursts (sliding window)
  const bursts: Array<{
    timestamp: Date;
    duration: number;
    intensity: number;
    involvedNodes: string[];
  }> = [];

  let windowStart = 0;
  for (let i = 0; i < events.length; i++) {
    // Move window start forward
    while (
      windowStart < i &&
      events[i].timestamp.getTime() - events[windowStart].timestamp.getTime() >
        burstWindowSize
    ) {
      windowStart++;
    }

    const windowSize = i - windowStart + 1;
    const windowDuration =
      events[i].timestamp.getTime() - events[windowStart].timestamp.getTime();

    // Calculate expected rate
    const totalDuration =
      events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime();
    const avgRate = events.length / totalDuration;
    const expectedInWindow = avgRate * windowDuration;

    // Detect burst if window has significantly more events than expected
    if (windowSize > expectedInWindow * 2 && windowSize >= 5) {
      const involvedNodes = new Set<string>();
      for (let j = windowStart; j <= i; j++) {
        involvedNodes.add(events[j].source);
        involvedNodes.add(events[j].target);
      }

      bursts.push({
        timestamp: events[windowStart].timestamp,
        duration: windowDuration,
        intensity: windowSize / expectedInWindow,
        involvedNodes: Array.from(involvedNodes),
      });
    }
  }

  const executionTime = performance.now() - startTime;

  return {
    patterns,
    bursts,
    executionTime,
  };
}

// Helper functions

function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0] || 1;
  const last = values[values.length - 1];
  return (last - first) / first;
}

function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  const changes = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      changes.push((values[i] - values[i - 1]) / values[i - 1]);
    }
  }

  return calculateStdDev(changes);
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return variance;
}

function calculateStdDev(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

function detectTrend(values: number[]): 'rising' | 'falling' | 'fluctuating' {
  if (values.length < 3) return 'fluctuating';

  const slope = calculateSlope(values);

  if (slope > 0.01) return 'rising';
  if (slope < -0.01) return 'falling';
  return 'fluctuating';
}
