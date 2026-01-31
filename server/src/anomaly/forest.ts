import { median } from '../anomaly';

export interface GraphNode {
  id: string;
  labels?: string[];
  tags?: string[];
  properties?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type?: string;
}

export interface Neo4jGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NodeFeatures {
  nodeId: string;
  degree: number;
  typeDiversity: number;
  tagCount: number;
  neighborDegree: number;
  normalizedDegree: number;
  labels: string[];
}

export interface AnomalyScore {
  id: string;
  score: number;
  isAnomaly: boolean;
  metrics: {
    degree: number;
    typeDiversity: number;
    tagCount: number;
    neighborDegree: number;
    normalizedDegree: number;
  };
  labels: string[];
  reason: string;
}

export interface Anomalies {
  summary: {
    totalNodes: number;
    totalEdges: number;
    anomalyCount: number;
    threshold: number;
    modelVersion: string;
  };
  nodes: AnomalyScore[];
}

const MODEL_VERSION = 'isolation-forest-lite-v1';
const DEFAULT_CONTAMINATION = 0.15;

function quantile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function medianAbsoluteDeviation(values: number[], med: number) {
  if (!values.length) return 0;
  const deviations = values.map((value) => Math.abs(value - med));
  return median(deviations);
}

function robustZ(value: number, med: number, mad: number) {
  return mad ? Math.abs(value - med) / (1.4826 * mad) : 0;
}

export function features(graph: Neo4jGraph): NodeFeatures[] {
  const adjacency = new Map<string, GraphEdge[]>();
  graph.nodes.forEach((node) => adjacency.set(node.id, []));

  for (const edge of graph.edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source)!.push(edge);
    }
    if (adjacency.has(edge.target)) {
      adjacency.get(edge.target)!.push(edge);
    }
  }

  const degrees: Record<string, number> = {};
  for (const [nodeId, edges] of adjacency.entries()) {
    degrees[nodeId] = edges.length;
  }

  const maxDegree = Math.max(...Object.values(degrees), 1);

  return graph.nodes.map((node) => {
    const nodeEdges = adjacency.get(node.id) ?? [];
    const neighborIds = nodeEdges.reduce<string[]>((acc, edge) => {
      if (edge.source !== node.id) acc.push(edge.source);
      if (edge.target !== node.id) acc.push(edge.target);
      return acc;
    }, []);

    const neighborDegreeValues = neighborIds.map((id) => degrees[id] ?? 0);
    const neighborDegree = neighborDegreeValues.length
      ? neighborDegreeValues.reduce((a, b) => a + b, 0) / neighborDegreeValues.length
      : 0;

    const typeDiversity = new Set(nodeEdges.map((edge) => edge.type ?? 'UNKNOWN')).size;
    const tags = node.tags ?? (Array.isArray(node.properties?.tags) ? (node.properties!.tags as string[]) : []);

    return {
      nodeId: node.id,
      degree: nodeEdges.length,
      typeDiversity,
      tagCount: tags.length,
      neighborDegree,
      normalizedDegree: nodeEdges.length / maxDegree,
      labels: node.labels ?? [],
    };
  });
}

const isolationForest = {
  fit_transform(input: NodeFeatures[], contamination = DEFAULT_CONTAMINATION): Anomalies {
    if (!input.length) {
      return {
        summary: {
          totalNodes: 0,
          totalEdges: 0,
          anomalyCount: 0,
          threshold: 0,
          modelVersion: MODEL_VERSION,
        },
        nodes: [],
      };
    }

    const degrees = input.map((item) => item.degree);
    const typeDiversity = input.map((item) => item.typeDiversity);
    const neighborDegrees = input.map((item) => item.neighborDegree);
    const tags = input.map((item) => item.tagCount);

    const degreeMedian = median(degrees);
    const typeMedian = median(typeDiversity);
    const neighborMedian = median(neighborDegrees);
    const tagMedian = median(tags);

    const degreeMad = medianAbsoluteDeviation(degrees, degreeMedian);
    const typeMad = medianAbsoluteDeviation(typeDiversity, typeMedian);
    const neighborMad = medianAbsoluteDeviation(neighborDegrees, neighborMedian);
    const tagMad = medianAbsoluteDeviation(tags, tagMedian);

    const scores = input.map((item) => {
      const zDegree = robustZ(item.degree, degreeMedian, degreeMad);
      const zType = robustZ(item.typeDiversity, typeMedian, typeMad);
      const zNeighbor = robustZ(item.neighborDegree, neighborMedian, neighborMad);
      const zTags = robustZ(item.tagCount, tagMedian, tagMad);
      return Number(((zDegree + zType + zNeighbor + zTags) / 4).toFixed(6));
    });

    const effectiveContamination = Math.min(Math.max(contamination, 1 / input.length), 0.5);
    const threshold = quantile(scores, 1 - effectiveContamination);

    const nodes: AnomalyScore[] = input.map((item, index) => {
      const score = scores[index];
      const isAnomaly = score >= threshold;
      const reasons: string[] = [];

      if (robustZ(item.degree, degreeMedian, degreeMad) >= threshold) {
        reasons.push('degree');
      }
      if (robustZ(item.typeDiversity, typeMedian, typeMad) >= threshold) {
        reasons.push('edge-type-diversity');
      }
      if (robustZ(item.neighborDegree, neighborMedian, neighborMad) >= threshold) {
        reasons.push('neighbor-degree');
      }
      if (robustZ(item.tagCount, tagMedian, tagMad) >= threshold) {
        reasons.push('tag-count');
      }

      return {
        id: item.nodeId,
        score,
        isAnomaly,
        metrics: {
          degree: item.degree,
          typeDiversity: item.typeDiversity,
          tagCount: item.tagCount,
          neighborDegree: Number(item.neighborDegree.toFixed(3)),
          normalizedDegree: Number(item.normalizedDegree.toFixed(3)),
        },
        labels: item.labels,
        reason: reasons.length ? `High variance in ${reasons.join(', ')}` : 'Within expected range',
      };
    });

    const anomalyCount = nodes.filter((node) => node.isAnomaly).length;

    return {
      summary: {
        totalNodes: input.length,
        totalEdges: input.reduce((acc, item) => acc + item.degree, 0) / 2,
        anomalyCount,
        threshold,
        modelVersion: MODEL_VERSION,
      },
      nodes,
    };
  },
};

export function score(graph: Neo4jGraph): Anomalies {
  return isolationForest.fit_transform(features(graph));
}

export { isolationForest };
