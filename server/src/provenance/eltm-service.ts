import {
  lineageSnapshots,
  manifestCache,
  type LineageEdge,
  type LineageNode,
  type LineageSnapshot,
  type ReplayManifest,
  type SnapshotMetrics,
} from './fixtures/eltm-fixtures.js';

export interface LineageSnapshotSummary {
  id: string;
  jobName: string;
  label: string;
  commitSha: string;
  capturedAt: string;
  triggeredBy: string;
  metrics: SnapshotMetrics;
  manifestChecksum: string;
}

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface NodeChange {
  nodeId: string;
  before: LineageNode;
  after: LineageNode;
  changedFields: string[];
}

export interface LineageDiff {
  sourceRunId: string;
  targetRunId: string;
  summary: {
    addedNodes: number;
    removedNodes: number;
    changedNodes: number;
    addedEdges: number;
    removedEdges: number;
    changedEdges: number;
  };
  nodeDiff: {
    added: LineageNode[];
    removed: LineageNode[];
    changed: NodeChange[];
    unchanged: string[];
  };
  edgeDiff: {
    added: LineageEdge[];
    removed: LineageEdge[];
    unchanged: string[];
  };
  sourceNodeStatus: Record<string, DiffStatus>;
  targetNodeStatus: Record<string, DiffStatus>;
  sourceEdgeStatus: Record<string, DiffStatus>;
  targetEdgeStatus: Record<string, DiffStatus>;
}

const sortedSnapshots = [...lineageSnapshots].sort((a, b) =>
  new Date(a.capturedAt).valueOf() - new Date(b.capturedAt).valueOf(),
);

const snapshotMap = new Map(sortedSnapshots.map((snapshot) => [snapshot.id, snapshot]));

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return [...value].map((entry) => normalizeValue(entry)).sort((a, b) => {
      const left = JSON.stringify(a);
      const right = JSON.stringify(b);
      return left.localeCompare(right);
    });
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, normalizeValue(val)] as const);
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      normalized[key] = val;
    }
    return normalized;
  }
  return value;
};

const normalizeNode = (node: LineageNode) => ({
  type: node.type,
  name: node.name,
  version: node.version,
  commitSha: node.commitSha ?? null,
  metadata: normalizeValue(node.metadata ?? {}),
  policies: node.policies ? [...node.policies].sort() : [],
});

const normalizeEdge = (edge: LineageEdge) => ({
  source: edge.source,
  target: edge.target,
  relationship: edge.relationship,
  description: edge.description ?? null,
  policyRefs: edge.policyRefs ? [...edge.policyRefs].sort() : [],
});

const valuesEqual = (a: unknown, b: unknown) =>
  JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b));

const diffNodeFields = (source: LineageNode, target: LineageNode): string[] => {
  const normalizedSource = normalizeNode(source);
  const normalizedTarget = normalizeNode(target);
  const keys = new Set([
    ...Object.keys(normalizedSource),
    ...Object.keys(normalizedTarget),
  ]);
  const changed: string[] = [];
  for (const key of keys) {
    if (!valuesEqual((normalizedSource as Record<string, unknown>)[key], (normalizedTarget as Record<string, unknown>)[key])) {
      changed.push(key);
    }
  }
  return changed.sort();
};

const nodesEqual = (a: LineageNode, b: LineageNode) => valuesEqual(normalizeNode(a), normalizeNode(b));
const edgesEqual = (a: LineageEdge, b: LineageEdge) => valuesEqual(normalizeEdge(a), normalizeEdge(b));

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const listSnapshots = (): LineageSnapshotSummary[] =>
  sortedSnapshots.map((snapshot) => ({
    id: snapshot.id,
    jobName: snapshot.jobName,
    label: snapshot.label,
    commitSha: snapshot.commitSha,
    capturedAt: snapshot.capturedAt,
    triggeredBy: snapshot.triggeredBy,
    metrics: deepClone(snapshot.metrics),
    manifestChecksum: snapshot.manifestChecksum,
  }));

export const getSnapshotById = (id: string): LineageSnapshot | undefined => snapshotMap.get(id);

const getSnapshotOrThrow = (id: string): LineageSnapshot => {
  const snapshot = getSnapshotById(id);
  if (!snapshot) {
    throw new Error(`Unknown lineage snapshot: ${id}`);
  }
  return snapshot;
};

export const getSnapshotForResponse = (id: string): LineageSnapshot => deepClone(getSnapshotOrThrow(id));

export const computeLineageDiff = (sourceId: string, targetId: string): LineageDiff => {
  const source = getSnapshotOrThrow(sourceId);
  const target = getSnapshotOrThrow(targetId);

  const sourceNodes = new Map(source.nodes.map((node) => [node.id, node]));
  const targetNodes = new Map(target.nodes.map((node) => [node.id, node]));

  const addedNodes: LineageNode[] = [];
  const removedNodes: LineageNode[] = [];
  const changedNodes: NodeChange[] = [];
  const unchangedNodes: string[] = [];
  const sourceNodeStatus: Record<string, DiffStatus> = {};
  const targetNodeStatus: Record<string, DiffStatus> = {};

  for (const [nodeId, sourceNode] of sourceNodes) {
    const targetNode = targetNodes.get(nodeId);
    if (!targetNode) {
      removedNodes.push(sourceNode);
      sourceNodeStatus[nodeId] = 'removed';
      continue;
    }
    if (nodesEqual(sourceNode, targetNode)) {
      unchangedNodes.push(nodeId);
      sourceNodeStatus[nodeId] = 'unchanged';
      targetNodeStatus[nodeId] = 'unchanged';
    } else {
      changedNodes.push({
        nodeId,
        before: sourceNode,
        after: targetNode,
        changedFields: diffNodeFields(sourceNode, targetNode),
      });
      sourceNodeStatus[nodeId] = 'changed';
      targetNodeStatus[nodeId] = 'changed';
    }
  }

  for (const [nodeId, targetNode] of targetNodes) {
    if (!sourceNodes.has(nodeId)) {
      addedNodes.push(targetNode);
      targetNodeStatus[nodeId] = 'added';
    } else if (!targetNodeStatus[nodeId]) {
      targetNodeStatus[nodeId] = sourceNodeStatus[nodeId] ?? 'unchanged';
    }
  }

  const sourceEdges = new Map(source.edges.map((edge) => [edge.id, edge]));
  const targetEdges = new Map(target.edges.map((edge) => [edge.id, edge]));

  const addedEdges: LineageEdge[] = [];
  const removedEdges: LineageEdge[] = [];
  const unchangedEdges: string[] = [];
  const sourceEdgeStatus: Record<string, DiffStatus> = {};
  const targetEdgeStatus: Record<string, DiffStatus> = {};

  for (const [edgeId, sourceEdge] of sourceEdges) {
    const targetEdge = targetEdges.get(edgeId);
    if (!targetEdge) {
      removedEdges.push(sourceEdge);
      sourceEdgeStatus[edgeId] = 'removed';
      continue;
    }
    if (edgesEqual(sourceEdge, targetEdge)) {
      unchangedEdges.push(edgeId);
      sourceEdgeStatus[edgeId] = 'unchanged';
      targetEdgeStatus[edgeId] = 'unchanged';
    } else {
      sourceEdgeStatus[edgeId] = 'changed';
      targetEdgeStatus[edgeId] = 'changed';
    }
  }

  for (const [edgeId, targetEdge] of targetEdges) {
    if (!sourceEdges.has(edgeId)) {
      addedEdges.push(targetEdge);
      targetEdgeStatus[edgeId] = 'added';
    } else if (!targetEdgeStatus[edgeId]) {
      targetEdgeStatus[edgeId] = sourceEdgeStatus[edgeId] ?? 'unchanged';
    }
  }

  const changedEdgeCount = Object.values(sourceEdgeStatus).filter((status) => status === 'changed').length;

  return {
    sourceRunId: source.id,
    targetRunId: target.id,
    summary: {
      addedNodes: addedNodes.length,
      removedNodes: removedNodes.length,
      changedNodes: changedNodes.length,
      addedEdges: addedEdges.length,
      removedEdges: removedEdges.length,
      changedEdges: changedEdgeCount,
    },
    nodeDiff: {
      added: addedNodes,
      removed: removedNodes,
      changed: changedNodes,
      unchanged: unchangedNodes,
    },
    edgeDiff: {
      added: addedEdges,
      removed: removedEdges,
      unchanged: unchangedEdges,
    },
    sourceNodeStatus,
    targetNodeStatus,
    sourceEdgeStatus,
    targetEdgeStatus,
  };
};

export const generateReplayManifest = (runId: string): ReplayManifest => {
  const manifest = manifestCache.get(runId);
  if (!manifest) {
    throw new Error(`Unknown lineage snapshot for manifest: ${runId}`);
  }
  return deepClone(manifest);
};
