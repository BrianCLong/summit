import neo4j from 'neo4j-driver';
import { performance } from 'node:perf_hooks';

type RelationshipDirection = 'OUTGOING' | 'INCOMING' | 'UNDIRECTED';

interface GraphEdgeData {
  id: string | null;
  from: string;
  to: string;
  type: string;
  weight: number;
}

interface GraphNodeAttributes {
  labels: string[];
}

interface GraphData {
  nodes: string[];
  nodeAttributes: Map<string, GraphNodeAttributes>;
  edges: GraphEdgeData[];
  outgoing: Map<string, GraphEdgeData[]>;
  incoming: Map<string, GraphEdgeData[]>;
  undirected: Map<string, Map<string, number>>;
  weightedDegrees: Map<string, number>;
  totalUndirectedWeight: number;
}

interface BaseGraphInput {
  nodeLabels?: string[] | null;
  relationshipTypes?: string[] | null;
  maxEdges?: number | null;
  weightProperty?: string | null;
}

export interface CommunityDetectionInput extends BaseGraphInput {
  algorithm: 'LOUVAIN' | 'LABEL_PROPAGATION';
  minCommunitySize?: number | null;
  maxIterations?: number | null;
}

export interface CentralityInput extends BaseGraphInput {
  algorithm: 'PAGERANK' | 'BETWEENNESS';
  maxResults?: number | null;
  dampingFactor?: number | null;
  tolerance?: number | null;
  maxIterations?: number | null;
  direction?: RelationshipDirection | null;
}

export interface ShortestPathInput {
  sourceId: string;
  targetId: string;
  relationshipTypes?: string[] | null;
  maxDepth?: number | null;
  direction?: RelationshipDirection | null;
  weightProperty?: string | null;
}

export interface GraphAnomalyInput extends BaseGraphInput {
  sensitivity?: number | null;
  minScore?: number | null;
}

export interface TemporalPatternInput {
  entity: 'NODE' | 'RELATIONSHIP';
  nodeLabels?: string[] | null;
  relationshipTypes?: string[] | null;
  timestampProperty: string;
  interval: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  maxEntries?: number | null;
  since?: string | null;
  until?: string | null;
}

export interface CommunityDetectionCommunity {
  communityId: number;
  nodes: string[];
  size: number;
  score: number;
}

export interface CommunityDetectionResult {
  algorithm: CommunityDetectionInput['algorithm'];
  communities: CommunityDetectionCommunity[];
  metadata: AnalyticsMetadata;
}

export interface CentralityScore {
  nodeId: string;
  score: number;
  rank: number;
}

export interface PathNode {
  id: string;
  labels: string[];
}

export interface PathEdge {
  id: string | null;
  type: string;
  weight: number;
}

export interface PathResult {
  sourceId: string;
  targetId: string;
  hops: number;
  totalCost: number | null;
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface GraphAnomalyMetric {
  key: string;
  value: number;
}

export interface GraphAnomaly {
  nodeId: string;
  score: number;
  reason: string;
  metrics: GraphAnomalyMetric[];
}

export interface TemporalMetric {
  bucket: string;
  count: number;
  avgDegree: number;
}

export interface AnalyticsMetadata {
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  runtimeMs: number;
}

type Logger = { debug?: (...args: any[]) => void; warn?: (...args: any[]) => void } | undefined;

const DEFAULT_MAX_EDGES = 25000;

async function withReadSession<T>(
  driver: neo4j.Driver,
  work: (session: neo4j.Session) => Promise<T>,
): Promise<T> {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    return await work(session);
  } finally {
    await session.close();
  }
}

function sanitizeRelationshipTypes(types?: string[] | null): string[] {
  if (!types) {
    return [];
  }
  return types
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => /^[A-Za-z0-9_]+$/.test(value))
    .map((value) => value.toUpperCase());
}

async function fetchGraphData(
  driver: neo4j.Driver,
  input: BaseGraphInput,
  logger?: Logger,
): Promise<GraphData> {
  const nodeLabels = input.nodeLabels?.filter(Boolean) ?? [];
  const relationshipTypes = sanitizeRelationshipTypes(input.relationshipTypes);
  const limit = Math.max(1, Math.min(input.maxEdges ?? DEFAULT_MAX_EDGES, 200000));
  const conditions: string[] = [];
  if (nodeLabels.length > 0) {
    conditions.push(
      'any(label IN labels(source) WHERE label IN $nodeLabels) OR any(label IN labels(target) WHERE label IN $nodeLabels)',
    );
  }
  if (relationshipTypes.length > 0) {
    conditions.push('type(rel) IN $relationshipTypes');
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return withReadSession(driver, async (session) => {
    const result = await session.run(
      `MATCH (source)-[rel]->(target)
       ${whereClause}
       RETURN elementId(source) AS sourceElementId,
              coalesce(source.id, elementId(source)) AS sourceId,
              labels(source) AS sourceLabels,
              elementId(target) AS targetElementId,
              coalesce(target.id, elementId(target)) AS targetId,
              labels(target) AS targetLabels,
              elementId(rel) AS relationshipId,
              type(rel) AS relationshipType,
              CASE
                WHEN $weightProperty IS NOT NULL AND rel[$weightProperty] IS NOT NULL THEN toFloat(rel[$weightProperty])
                ELSE 1.0
              END AS weight
       LIMIT $limit`,
      {
        nodeLabels,
        relationshipTypes,
        weightProperty: input.weightProperty ?? null,
        limit,
      },
    );

    const nodeAttributes = new Map<string, GraphNodeAttributes>();
    const outgoing = new Map<string, GraphEdgeData[]>();
    const incoming = new Map<string, GraphEdgeData[]>();
    const undirected = new Map<string, Map<string, number>>();
    const undirectedWeights = new Map<string, number>();
    const edges: GraphEdgeData[] = [];

    for (const record of result.records) {
      const from = record.get('sourceId') as string;
      const to = record.get('targetId') as string;
      const weightValue = record.get('weight');
      const weight = typeof weightValue === 'number' && Number.isFinite(weightValue)
        ? weightValue
        : 1;
      const edge: GraphEdgeData = {
        id: (record.get('relationshipId') as string | null) ?? null,
        from,
        to,
        type: (record.get('relationshipType') as string) ?? 'RELATED_TO',
        weight,
      };
      edges.push(edge);

      const sourceLabels = (record.get('sourceLabels') as string[]) ?? [];
      const targetLabels = (record.get('targetLabels') as string[]) ?? [];
      if (!nodeAttributes.has(from)) {
        nodeAttributes.set(from, { labels: sourceLabels });
      }
      if (!nodeAttributes.has(to)) {
        nodeAttributes.set(to, { labels: targetLabels });
      }

      if (!outgoing.has(from)) {
        outgoing.set(from, []);
      }
      outgoing.get(from)!.push(edge);

      if (!incoming.has(to)) {
        incoming.set(to, []);
      }
      incoming.get(to)!.push(edge);

      const key = from < to ? `${from}|${to}` : `${to}|${from}`;
      undirectedWeights.set(key, (undirectedWeights.get(key) ?? 0) + weight);

      if (!undirected.has(from)) {
        undirected.set(from, new Map());
      }
      const fromNeighbors = undirected.get(from)!;
      fromNeighbors.set(to, (fromNeighbors.get(to) ?? 0) + weight);

      if (!undirected.has(to)) {
        undirected.set(to, new Map());
      }
      const toNeighbors = undirected.get(to)!;
      toNeighbors.set(from, (toNeighbors.get(from) ?? 0) + weight);
    }

    if (result.records.length === limit) {
      logger?.warn?.({ limit }, 'Graph analytics truncated due to edge limit');
    }

    const nodes = Array.from(nodeAttributes.keys());
    const weightedDegrees = new Map<string, number>();
    for (const node of nodes) {
      const neighbors = undirected.get(node);
      if (!neighbors) {
        weightedDegrees.set(node, 0);
        continue;
      }
      let sum = 0;
      for (const weight of neighbors.values()) {
        sum += weight;
      }
      weightedDegrees.set(node, sum);
    }

    let totalUndirectedWeight = 0;
    for (const weight of undirectedWeights.values()) {
      totalUndirectedWeight += weight;
    }

    return {
      nodes,
      nodeAttributes,
      edges,
      outgoing,
      incoming,
      undirected,
      weightedDegrees,
      totalUndirectedWeight,
    } satisfies GraphData;
  });
}

function labelPropagationCommunities(
  nodes: string[],
  adjacency: Map<string, Map<string, number>>,
  maxIterations: number,
): Map<string, string[]> {
  const labels = new Map<string, string>();
  for (const node of nodes) {
    labels.set(node, node);
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;
    for (const node of nodes) {
      const neighbors = adjacency.get(node);
      if (!neighbors || neighbors.size === 0) {
        continue;
      }
      const labelCounts = new Map<string, number>();
      for (const neighbor of neighbors.keys()) {
        const label = labels.get(neighbor);
        if (!label) {
          continue;
        }
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      }
      if (labelCounts.size === 0) {
        continue;
      }
      const sorted = Array.from(labelCounts.entries()).sort((a, b) => {
        if (b[1] === a[1]) {
          return a[0].localeCompare(b[0]);
        }
        return b[1] - a[1];
      });
      const bestLabel = sorted[0][0];
      if (bestLabel !== labels.get(node)) {
        labels.set(node, bestLabel);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  const communities = new Map<string, string[]>();
  for (const [node, label] of labels.entries()) {
    if (!communities.has(label)) {
      communities.set(label, []);
    }
    communities.get(label)!.push(node);
  }
  return communities;
}

function louvainCommunities(
  nodes: string[],
  adjacency: Map<string, Map<string, number>>,
  weightedDegrees: Map<string, number>,
  totalWeight: number,
  maxIterations: number,
): Map<string, string[]> {
  if (totalWeight === 0) {
    const singleton = new Map<string, string[]>();
    for (const node of nodes) {
      singleton.set(node, [node]);
    }
    return singleton;
  }

  const communities = new Map<string, string>();
  const communityWeights = new Map<string, number>();
  for (const node of nodes) {
    communities.set(node, node);
    communityWeights.set(node, weightedDegrees.get(node) ?? 0);
  }

  const twoM = 2 * totalWeight;

  for (let pass = 0; pass < maxIterations; pass += 1) {
    let moved = false;
    for (const node of nodes) {
      const nodeCommunity = communities.get(node)!;
      const nodeDegree = weightedDegrees.get(node) ?? 0;
      const neighbors = adjacency.get(node);
      const weightsByCommunity = new Map<string, number>();
      if (neighbors) {
        for (const [neighbor, weight] of neighbors.entries()) {
          const community = communities.get(neighbor)!;
          weightsByCommunity.set(
            community,
            (weightsByCommunity.get(community) ?? 0) + weight,
          );
        }
      }

      communityWeights.set(nodeCommunity, (communityWeights.get(nodeCommunity) ?? 0) - nodeDegree);

      let bestCommunity = nodeCommunity;
      let bestGain = 0;

      for (const [community, weightToCommunity] of weightsByCommunity.entries()) {
        const communityWeight = communityWeights.get(community) ?? 0;
        const gain = weightToCommunity - (nodeDegree * communityWeight) / twoM;
        if (gain > bestGain + 1e-9 || (gain > bestGain - 1e-9 && community < bestCommunity)) {
          bestGain = gain;
          bestCommunity = community;
        }
      }

      communityWeights.set(nodeCommunity, (communityWeights.get(nodeCommunity) ?? 0) + nodeDegree);

      if (bestCommunity !== nodeCommunity) {
        communityWeights.set(nodeCommunity, (communityWeights.get(nodeCommunity) ?? 0) - nodeDegree);
        communityWeights.set(bestCommunity, (communityWeights.get(bestCommunity) ?? 0) + nodeDegree);
        communities.set(node, bestCommunity);
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  const membership = new Map<string, string[]>();
  for (const [node, community] of communities.entries()) {
    if (!membership.has(community)) {
      membership.set(community, []);
    }
    membership.get(community)!.push(node);
  }
  return membership;
}

function computeCommunityDensity(
  nodes: string[],
  adjacency: Map<string, Map<string, number>>,
): number {
  if (nodes.length <= 1) {
    return 0;
  }
  const nodeSet = new Set(nodes);
  let internalWeight = 0;
  for (const node of nodes) {
    const neighbors = adjacency.get(node);
    if (!neighbors) {
      continue;
    }
    for (const [neighbor, weight] of neighbors.entries()) {
      if (!nodeSet.has(neighbor)) {
        continue;
      }
      if (node < neighbor) {
        internalWeight += weight;
      }
    }
  }
  const possibleEdges = (nodes.length * (nodes.length - 1)) / 2;
  return possibleEdges === 0 ? 0 : internalWeight / possibleEdges;
}

function computePageRank(
  graph: GraphData,
  dampingFactor: number,
  tolerance: number,
  maxIterations: number,
  direction: RelationshipDirection,
): Map<string, number> {
  const nodes = graph.nodes;
  const nodeCount = nodes.length;
  if (nodeCount === 0) {
    return new Map();
  }
  const damping = Math.min(Math.max(dampingFactor, 0.05), 0.99);
  const baseValue = (1 - damping) / nodeCount;
  const scores = new Map<string, number>();
  const outgoingWeights = new Map<string, number>();
  const relevantOutgoing = direction === 'INCOMING' ? graph.incoming : graph.outgoing;

  for (const node of nodes) {
    scores.set(node, 1 / nodeCount);
    const edges = relevantOutgoing.get(node) ?? [];
    let weightSum = 0;
    for (const edge of edges) {
      weightSum += edge.weight;
    }
    outgoingWeights.set(node, weightSum);
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let maxDelta = 0;
    let danglingMass = 0;
    const nextScores = new Map<string, number>();
    for (const node of nodes) {
      nextScores.set(node, baseValue);
    }

    for (const node of nodes) {
      const score = scores.get(node)!;
      const edges = relevantOutgoing.get(node) ?? [];
      const weightSum = outgoingWeights.get(node) ?? 0;
      if (weightSum === 0 || edges.length === 0) {
        danglingMass += score;
        continue;
      }
      for (const edge of edges) {
        const contribution = (score * edge.weight) / weightSum;
        nextScores.set(edge.to, (nextScores.get(edge.to) ?? 0) + damping * contribution);
      }
    }

    const danglingContribution = (danglingMass * damping) / nodeCount;
    for (const node of nodes) {
      nextScores.set(node, (nextScores.get(node) ?? 0) + danglingContribution);
      const delta = Math.abs(nextScores.get(node)! - scores.get(node)!);
      if (delta > maxDelta) {
        maxDelta = delta;
      }
    }

    for (const [node, value] of nextScores.entries()) {
      scores.set(node, value);
    }

    if (maxDelta < tolerance) {
      break;
    }
  }

  return scores;
}

function computeBetweenness(
  graph: GraphData,
): Map<string, number> {
  const scores = new Map<string, number>();
  const adjacency = graph.undirected;
  const nodes = graph.nodes;
  for (const node of nodes) {
    scores.set(node, 0);
  }

  for (const source of nodes) {
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const distance = new Map<string, number>();
    const queue: string[] = [];

    for (const node of nodes) {
      predecessors.set(node, []);
      sigma.set(node, 0);
      distance.set(node, -1);
    }

    sigma.set(source, 1);
    distance.set(source, 0);
    queue.push(source);

    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      const neighbors = adjacency.get(v);
      if (!neighbors) {
        continue;
      }
      for (const neighbor of neighbors.keys()) {
        if ((distance.get(neighbor) ?? -1) < 0) {
          queue.push(neighbor);
          distance.set(neighbor, (distance.get(v) ?? 0) + 1);
        }
        if ((distance.get(neighbor) ?? 0) === (distance.get(v) ?? 0) + 1) {
          sigma.set(neighbor, (sigma.get(neighbor) ?? 0) + (sigma.get(v) ?? 0));
          predecessors.get(neighbor)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const node of nodes) {
      delta.set(node, 0);
    }

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of predecessors.get(w) ?? []) {
        const ratio = (sigma.get(v) ?? 0) / (sigma.get(w) ?? 1);
        delta.set(v, (delta.get(v) ?? 0) + ratio * (1 + (delta.get(w) ?? 0)));
      }
      if (w !== source) {
        scores.set(w, (scores.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  const normalization = nodes.length > 1 ? 1 / ((nodes.length - 1) * (nodes.length - 2)) : 1;
  for (const node of nodes) {
    scores.set(node, (scores.get(node) ?? 0) * normalization);
  }

  return scores;
}

function buildPathPattern(
  relationshipTypes: string[],
  direction: RelationshipDirection,
  maxDepth: number,
): string {
  const typeSegment = relationshipTypes.length > 0 ? `:${relationshipTypes.join('|')}` : '';
  const pattern = `[${typeSegment}*..${maxDepth}]`;
  if (direction === 'INCOMING') {
    return `<-${pattern}-`;
  }
  if (direction === 'UNDIRECTED') {
    return `-${pattern}-`;
  }
  return `-${pattern}->`;
}

function parseTemporalValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'object') {
    const asString = String(value);
    const time = Date.parse(asString);
    return Number.isNaN(time) ? null : time;
  }
  return null;
}

function truncateToInterval(timestamp: number, interval: TemporalPatternInput['interval']): number {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  if (interval === 'HOUR') {
    date.setMinutes(0, 0, 0);
  } else if (interval === 'DAY') {
    date.setHours(0, 0, 0, 0);
  } else if (interval === 'WEEK') {
    const day = date.getUTCDay();
    const diff = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
  } else if (interval === 'MONTH') {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  } else if (interval === 'QUARTER') {
    const month = date.getUTCMonth();
    const quarterStart = month - (month % 3);
    date.setUTCMonth(quarterStart, 1);
    date.setUTCHours(0, 0, 0, 0);
  } else if (interval === 'YEAR') {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.getTime();
}

export async function runCommunityDetection(
  driver: neo4j.Driver,
  input: CommunityDetectionInput,
  logger?: Logger,
): Promise<CommunityDetectionResult> {
  const start = performance.now();
  const graph = await fetchGraphData(driver, input, logger);
  const maxIterations = Math.max(1, input.maxIterations ?? 20);
  const minCommunitySize = Math.max(1, input.minCommunitySize ?? 1);

  if (graph.nodes.length === 0) {
    return {
      algorithm: input.algorithm,
      communities: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeCount: 0,
        edgeCount: 0,
        runtimeMs: 0,
      },
    };
  }

  let communities: Map<string, string[]>;
  if (input.algorithm === 'LABEL_PROPAGATION') {
    communities = labelPropagationCommunities(graph.nodes, graph.undirected, maxIterations);
  } else {
    communities = louvainCommunities(
      graph.nodes,
      graph.undirected,
      graph.weightedDegrees,
      graph.totalUndirectedWeight,
      maxIterations,
    );
  }

  const filtered = Array.from(communities.values()).filter((nodes) => nodes.length >= minCommunitySize);
  filtered.sort((a, b) => b.length - a.length);
  const mapped: CommunityDetectionCommunity[] = filtered.map((nodes, index) => ({
    communityId: index,
    nodes: nodes.slice().sort(),
    size: nodes.length,
    score: computeCommunityDensity(nodes, graph.undirected),
  }));

  return {
    algorithm: input.algorithm,
    communities: mapped,
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      runtimeMs: performance.now() - start,
    },
  };
}

export async function runCentrality(
  driver: neo4j.Driver,
  input: CentralityInput,
  logger?: Logger,
): Promise<CentralityScore[]> {
  const start = performance.now();
  const graph = await fetchGraphData(driver, input, logger);
  if (graph.nodes.length === 0) {
    return [];
  }

  const damping = input.dampingFactor ?? 0.85;
  const tolerance = input.tolerance ?? 1e-6;
  const maxIterations = Math.max(1, input.maxIterations ?? 100);
  const direction = input.direction ?? 'OUTGOING';

  let scores: Map<string, number>;
  if (input.algorithm === 'BETWEENNESS') {
    scores = computeBetweenness(graph);
  } else {
    scores = computePageRank(graph, damping, tolerance, maxIterations, direction);
  }

  const entries = Array.from(scores.entries()).map(([nodeId, score]) => ({ nodeId, score }));
  entries.sort((a, b) => b.score - a.score);
  const maxResults = Math.max(1, input.maxResults ?? 25);

  return entries.slice(0, maxResults).map((entry, index) => ({
    nodeId: entry.nodeId,
    score: entry.score,
    rank: index + 1,
  }));
}

export async function runShortestPath(
  driver: neo4j.Driver,
  input: ShortestPathInput,
): Promise<PathResult | null> {
  const relationshipTypes = sanitizeRelationshipTypes(input.relationshipTypes);
  const maxDepth = Math.max(1, Math.min(input.maxDepth ?? 5, 20));
  const direction = input.direction ?? 'OUTGOING';
  const pathPattern = buildPathPattern(relationshipTypes, direction, maxDepth);

  return withReadSession(driver, async (session) => {
    const result = await session.run(
      `MATCH (source {id: $sourceId}), (target {id: $targetId})
       CALL {
         WITH source, target
         MATCH path = shortestPath((source)${pathPattern}(target))
         RETURN path
       }
       RETURN [node IN nodes(path) | { id: coalesce(node.id, elementId(node)), labels: labels(node) }] AS nodes,
              [rel IN relationships(path) |
                {
                  id: coalesce(rel.id, elementId(rel)),
                  type: type(rel),
                  weight: CASE
                    WHEN $weightProperty IS NOT NULL AND rel[$weightProperty] IS NOT NULL THEN toFloat(rel[$weightProperty])
                    ELSE 1.0
                  END
                }
              ] AS edges,
              length(path) AS hops,
              reduce(total = 0.0, rel IN relationships(path) |
                total + CASE
                  WHEN $weightProperty IS NOT NULL AND rel[$weightProperty] IS NOT NULL THEN toFloat(rel[$weightProperty])
                  ELSE 1.0
                END
              ) AS totalCost
       LIMIT 1`,
      {
        sourceId: input.sourceId,
        targetId: input.targetId,
        weightProperty: input.weightProperty ?? null,
      },
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const nodes = (record.get('nodes') as PathNode[]) ?? [];
    const edges = (record.get('edges') as PathEdge[]) ?? [];
    const hopsValue = record.get('hops');
    const totalCostValue = record.get('totalCost');

    return {
      sourceId: input.sourceId,
      targetId: input.targetId,
      nodes,
      edges,
      hops: typeof hopsValue === 'number' ? hopsValue : edges.length,
      totalCost:
        typeof totalCostValue === 'number' && Number.isFinite(totalCostValue)
          ? totalCostValue
          : null,
    } satisfies PathResult;
  });
}

export async function detectGraphAnomalies(
  driver: neo4j.Driver,
  input: GraphAnomalyInput,
  logger?: Logger,
): Promise<GraphAnomaly[]> {
  const graph = await fetchGraphData(driver, input, logger);
  if (graph.nodes.length === 0) {
    return [];
  }
  const sensitivity = Math.max(1, input.sensitivity ?? 2);
  const minScore = input.minScore ?? 0;

  const degrees: number[] = [];
  const degreeByNode = new Map<string, number>();
  const weightedDegreeByNode = new Map<string, number>();

  for (const node of graph.nodes) {
    const neighbors = graph.undirected.get(node);
    const degree = neighbors ? neighbors.size : 0;
    const weightedDegree = graph.weightedDegrees.get(node) ?? 0;
    degrees.push(degree);
    degreeByNode.set(node, degree);
    weightedDegreeByNode.set(node, weightedDegree);
  }

  const mean = degrees.reduce((acc, value) => acc + value, 0) / degrees.length;
  const variance = degrees.reduce((acc, value) => acc + (value - mean) ** 2, 0) / degrees.length;
  const stdDev = Math.sqrt(variance);

  const pageRankScores = computePageRank(graph, 0.85, 1e-6, 75, 'OUTGOING');
  const pageRankValues = Array.from(pageRankScores.values());
  const prMean = pageRankValues.reduce((acc, value) => acc + value, 0) / pageRankValues.length;
  const prVariance = pageRankValues.reduce((acc, value) => acc + (value - prMean) ** 2, 0) / pageRankValues.length;
  const prStdDev = Math.sqrt(prVariance);

  const anomalies: GraphAnomaly[] = [];

  for (const node of graph.nodes) {
    const degree = degreeByNode.get(node) ?? 0;
    const weightedDegree = weightedDegreeByNode.get(node) ?? 0;
    const degreeZ = stdDev === 0 ? 0 : (degree - mean) / stdDev;
    const pageRank = pageRankScores.get(node) ?? 0;
    const prZ = prStdDev === 0 ? 0 : (pageRank - prMean) / prStdDev;

    if (degreeZ >= sensitivity && degreeZ >= minScore) {
      anomalies.push({
        nodeId: node,
        score: degreeZ,
        reason: 'HIGH_DEGREE',
        metrics: [
          { key: 'degree', value: degree },
          { key: 'weightedDegree', value: weightedDegree },
          { key: 'degreeZ', value: degreeZ },
          { key: 'pageRank', value: pageRank },
        ],
      });
      continue;
    }

    if (prZ >= sensitivity && prZ >= minScore) {
      anomalies.push({
        nodeId: node,
        score: prZ,
        reason: 'HIGH_CENTRALITY',
        metrics: [
          { key: 'degree', value: degree },
          { key: 'weightedDegree', value: weightedDegree },
          { key: 'pageRank', value: pageRank },
          { key: 'pageRankZ', value: prZ },
        ],
      });
    }
  }

  return anomalies.sort((a, b) => b.score - a.score);
}

export async function analyzeTemporalPatterns(
  driver: neo4j.Driver,
  input: TemporalPatternInput,
): Promise<TemporalMetric[]> {
  const limit = Math.max(1, Math.min(input.maxEntries ?? 10000, 200000));
  const nodeLabels = input.nodeLabels?.filter(Boolean) ?? [];
  const relationshipTypes = sanitizeRelationshipTypes(input.relationshipTypes);

  const records = await withReadSession(driver, async (session) => {
    if (input.entity === 'RELATIONSHIP') {
      const result = await session.run(
        `MATCH (source)-[entity]->(target)
         WHERE ($relTypesSize = 0 OR type(entity) IN $relationshipTypes)
           AND ($nodeLabelsSize = 0 OR any(label IN labels(source) WHERE label IN $nodeLabels)
             OR any(label IN labels(target) WHERE label IN $nodeLabels))
         RETURN entity[$timestampProperty] AS timestamp,
                size((source)--()) + size((target)--()) AS degree
         LIMIT $limit`,
        {
          relationshipTypes,
          nodeLabels,
          timestampProperty: input.timestampProperty,
          limit,
          relTypesSize: relationshipTypes.length,
          nodeLabelsSize: nodeLabels.length,
        },
      );
      return result.records;
    }

    const result = await session.run(
      `MATCH (entity)
       WHERE ($nodeLabelsSize = 0 OR any(label IN labels(entity) WHERE label IN $nodeLabels))
         AND entity[$timestampProperty] IS NOT NULL
       RETURN entity[$timestampProperty] AS timestamp,
              size((entity)--()) AS degree
       LIMIT $limit`,
      {
        nodeLabels,
        timestampProperty: input.timestampProperty,
        limit,
        nodeLabelsSize: nodeLabels.length,
      },
    );
    return result.records;
  });

  const since = input.since ? parseTemporalValue(input.since) : null;
  const until = input.until ? parseTemporalValue(input.until) : null;

  const buckets = new Map<number, { count: number; degreeTotal: number }>();

  for (const record of records) {
    const timestamp = parseTemporalValue(record.get('timestamp'));
    if (timestamp === null) {
      continue;
    }
    if (since !== null && timestamp < since) {
      continue;
    }
    if (until !== null && timestamp > until) {
      continue;
    }
    const degreeValue = record.get('degree');
    const degree = typeof degreeValue === 'number' && Number.isFinite(degreeValue) ? degreeValue : 0;
    const bucketKey = truncateToInterval(timestamp, input.interval);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { count: 0, degreeTotal: 0 });
    }
    const bucket = buckets.get(bucketKey)!;
    bucket.count += 1;
    bucket.degreeTotal += degree;
  }

  const metrics: TemporalMetric[] = [];
  for (const [bucketTimestamp, data] of buckets.entries()) {
    metrics.push({
      bucket: new Date(bucketTimestamp).toISOString(),
      count: data.count,
      avgDegree: data.count === 0 ? 0 : data.degreeTotal / data.count,
    });
  }

  metrics.sort((a, b) => a.bucket.localeCompare(b.bucket));
  return metrics;
}

