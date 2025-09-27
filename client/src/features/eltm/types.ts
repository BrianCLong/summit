export type LineageNodeType = 'dataset' | 'transform' | 'policy' | 'output';

export interface LineageNode {
  id: string;
  type: LineageNodeType;
  name: string;
  version: string;
  commitSha?: string;
  metadata?: Record<string, unknown>;
  policies?: string[];
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'consumes' | 'produces' | 'governs';
  description?: string;
  policyRefs?: string[];
}

export interface SnapshotMetrics {
  runDurationSeconds: number;
  outputRecords: number;
  dataFreshnessHours: number;
}

export interface SnapshotSummary {
  id: string;
  jobName: string;
  label: string;
  commitSha: string;
  capturedAt: string;
  triggeredBy: string;
  metrics: SnapshotMetrics;
  manifestChecksum: string;
}

export interface ParameterLock {
  key: string;
  value: string;
  description: string;
  source: string;
  locked: boolean;
  checksum: string;
}

export interface ArtifactLock {
  datasetId: string;
  version: string;
  uri: string;
  format: string;
  sizeBytes: number;
  checksum: string;
  locked: boolean;
}

export interface OutputArtifact {
  datasetId: string;
  version: string;
  uri: string;
  format: string;
  sizeBytes: number;
  checksum: string;
}

export interface PolicyLock {
  id: string;
  name: string;
  sha: string;
  enforcedBy: string;
}

export interface ReplayContext {
  orchestratorImage: string;
  entrypoint: string;
  environment: Record<string, string>;
  parameters: ParameterLock[];
  inputs: ArtifactLock[];
  outputs: OutputArtifact[];
  policies: PolicyLock[];
}

export interface LineageSnapshot {
  id: string;
  jobName: string;
  label: string;
  commitSha: string;
  capturedAt: string;
  triggeredBy: string;
  metrics: SnapshotMetrics;
  nodes: LineageNode[];
  edges: LineageEdge[];
  replay: ReplayContext;
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

export interface ReplayManifest {
  runId: string;
  jobName: string;
  commitSha: string;
  capturedAt: string;
  orchestratorImage: string;
  entrypoint: string;
  environment: Record<string, string>;
  inputs: ArtifactLock[];
  parameters: ParameterLock[];
  outputs: OutputArtifact[];
  policies: PolicyLock[];
  artifactChecksum: string;
}
