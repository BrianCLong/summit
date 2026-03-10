/**
 * Innovation Graph Core Interfaces
 */

import type { EvidenceRef } from "./evidence.js";
import type { InnovationNodeType } from "../graph-fabric/ontology/node-types.js";
import type { InnovationEdgeType } from "../graph-fabric/ontology/edge-types.js";

export interface InnovationNode {
  id: string;
  type: InnovationNodeType;
  name: string;
  description?: string;
  attrs: Record<string, unknown>;
  firstSeenAt?: string;
  lastSeenAt?: string;
  evidenceRefs: EvidenceRef[];
}

export interface InnovationEdge {
  id: string;
  type: InnovationEdgeType;
  from: string;
  to: string;
  weight?: number;
  attrs?: Record<string, unknown>;
  evidenceRefs: EvidenceRef[];
}

export interface InnovationGraph {
  metadata: {
    id: string;
    version: string;
    description?: string;
    createdAt: string;
    tags?: string[];
  };
  nodes: InnovationNode[];
  edges: InnovationEdge[];
  stats?: GraphStatistics;
}

export interface GraphStatistics {
  nodeCountByType: Record<string, number>;
  edgeCountByType: Record<string, number>;
  totalNodes: number;
  totalEdges: number;
  totalEvidenceRefs: number;
  avgConfidence: number;
  temporalCoverage?: {
    earliestObservation: string;
    latestObservation: string;
    spanDays: number;
  };
}

export interface GraphDelta {
  metadata: { from: string; to: string; computedAt: string };
  nodesAdded: InnovationNode[];
  nodesRemoved: InnovationNode[];
  nodesModified: Array<{ before: InnovationNode; after: InnovationNode }>;
  edgesAdded: InnovationEdge[];
  edgesRemoved: InnovationEdge[];
  edgesModified: Array<{ before: InnovationEdge; after: InnovationEdge }>;
  summary: {
    totalNodesAdded: number;
    totalNodesRemoved: number;
    totalNodesModified: number;
    totalEdgesAdded: number;
    totalEdgesRemoved: number;
    totalEdgesModified: number;
  };
}

export interface TemporalSnapshot {
  id: string;
  timestamp: string;
  graph: InnovationGraph;
  delta?: GraphDelta;
  metadata?: {
    isMilestone?: boolean;
    milestoneDescription?: string;
    tags?: string[];
  };
}

export interface TemporalGraphSeries {
  metadata: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
  };
  snapshots: TemporalSnapshot[];
  coverage: {
    startTime: string;
    endTime: string;
    totalSnapshots: number;
    avgIntervalDays: number;
  };
}

export interface GraphQueryResult {
  nodes: InnovationNode[];
  edges: InnovationEdge[];
  metadata: {
    query: string;
    executedAt: string;
    executionTimeMs: number;
    resultCount: number;
  };
}
