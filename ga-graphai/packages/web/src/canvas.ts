import {
  ObserverTimeline,
  ObserverTimelineFrame,
  TimelineStatusCounts,
  WorkflowDefinition,
  WorkflowRunRecord,
  type NodeRunStatus,
} from 'common-types';
import {
  computeWorkflowEstimates,
  topologicalSort,
  validateWorkflow,
} from 'policy';

export interface CanvasNodePosition {
  x: number;
  y: number;
  column: number;
  lane: number;
  width: number;
  height: number;
}

export interface CanvasRuntimeState {
  status: NodeRunStatus;
  startedAt?: string;
  finishedAt?: string;
}

export interface CanvasState {
  workflow: WorkflowDefinition;
  positions: Record<string, CanvasNodePosition>;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  selectedNodeIds: string[];
  criticalPath: string[];
  validation: ReturnType<typeof validateWorkflow>;
  runtime: Record<string, CanvasRuntimeState>;
}

export interface LayoutOptions {
  columnSpacing?: number;
  rowSpacing?: number;
  laneSpacing?: number;
  criticalLane?: number;
}

export interface ObserverState {
  runId: string;
  timeline: ObserverTimeline;
  currentIndex: number;
  playbackSpeed: number;
  isPlaying: boolean;
}

export interface PlaybackOptions {
  direction?: 'forward' | 'backward';
  step?: number;
  loop?: boolean;
}

export interface WorkflowDiff {
  addedNodes: string[];
  removedNodes: string[];
  changedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
}

export interface DependencyGraphNodeState {
  id: string;
  label: string;
  status: NodeRunStatus;
  column: number;
  lane: number;
  position: CanvasNodePosition;
  dependencies: string[];
  dependents: string[];
  isCritical: boolean;
  isBlocked: boolean;
  startedAt?: string;
  finishedAt?: string;
}

export interface DependencyGraphEdgeState {
  id: string;
  from: string;
  to: string;
  condition: string;
  isCritical: boolean;
  isSatisfied: boolean;
}

export interface DependencyGraphSnapshot {
  nodes: DependencyGraphNodeState[];
  edges: DependencyGraphEdgeState[];
  statusCounts: TimelineStatusCounts;
  progressPercent: number;
}

const DEFAULT_NODE_WIDTH = 260;
const DEFAULT_NODE_HEIGHT = 140;

export function createCanvasState(workflow: WorkflowDefinition): CanvasState {
  const validation = validateWorkflow(workflow);
  const criticalPath = validation.analysis.estimated.criticalPath;
  const positions = computeConstraintAwareLayout(
    validation.normalized,
    { criticalLane: 0 },
    criticalPath,
  );
  return {
    workflow: validation.normalized,
    positions,
    viewport: { zoom: 1, panX: 0, panY: 0 },
    selectedNodeIds: [],
    criticalPath,
    validation,
    runtime: {},
  };
}

export function autoLayout(
  state: CanvasState,
  options: LayoutOptions = {},
): CanvasState {
  const criticalPath = state.validation.analysis.estimated.criticalPath;
  const positions = computeConstraintAwareLayout(
    state.workflow,
    options,
    criticalPath,
  );
  return {
    ...state,
    positions,
  };
}

export function updateNodePosition(
  state: CanvasState,
  nodeId: string,
  patch: Partial<CanvasNodePosition>,
): CanvasState {
  const current = state.positions[nodeId] ?? {
    x: 0,
    y: 0,
    column: 0,
    lane: 0,
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
  };
  return {
    ...state,
    positions: {
      ...state.positions,
      [nodeId]: { ...current, ...patch },
    },
  };
}

export function selectNodes(
  state: CanvasState,
  nodeIds: string[],
): CanvasState {
  return {
    ...state,
    selectedNodeIds: [...new Set(nodeIds)],
  };
}

export function applyRunUpdate(
  state: CanvasState,
  run: WorkflowRunRecord,
): CanvasState {
  const runtime: Record<string, CanvasRuntimeState> = { ...state.runtime };
  for (const snapshot of run.nodes ?? []) {
    runtime[snapshot.nodeId] = {
      status: snapshot.status,
      startedAt: snapshot.startedAt,
      finishedAt: snapshot.finishedAt,
    };
  }
  return {
    ...state,
    runtime,
    criticalPath: run.stats.criticalPath ?? state.criticalPath,
  };
}

export function computeWorkflowDiff(
  current: WorkflowDefinition,
  next: WorkflowDefinition,
): WorkflowDiff {
  const currentNodeMap = new Map(
    current.nodes.map((node) => [node.id, node] as const),
  );
  const nextNodeMap = new Map(
    next.nodes.map((node) => [node.id, node] as const),
  );

  const addedNodes = [...nextNodeMap.keys()].filter(
    (id) => !currentNodeMap.has(id),
  );
  const removedNodes = [...currentNodeMap.keys()].filter(
    (id) => !nextNodeMap.has(id),
  );
  const changedNodes: string[] = [];

  for (const [id, node] of currentNodeMap.entries()) {
    if (!nextNodeMap.has(id)) {
      continue;
    }
    const candidate = nextNodeMap.get(id)!;
    if (
      node.type !== candidate.type ||
      JSON.stringify(node.params) !== JSON.stringify(candidate.params) ||
      JSON.stringify(node.evidenceOutputs ?? []) !==
        JSON.stringify(candidate.evidenceOutputs ?? [])
    ) {
      changedNodes.push(id);
    }
  }

  const currentEdges = new Set(
    current.edges.map((edge) => serializeEdge(edge.from, edge.to, edge.on)),
  );
  const nextEdges = new Set(
    next.edges.map((edge) => serializeEdge(edge.from, edge.to, edge.on)),
  );
  const addedEdges = [...nextEdges].filter((edge) => !currentEdges.has(edge));
  const removedEdges = [...currentEdges].filter((edge) => !nextEdges.has(edge));

  return { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges };
}

export function createObserverState(run: WorkflowRunRecord): ObserverState {
  const timeline = buildObserverTimeline(run);
  return {
    runId: run.runId,
    timeline,
    currentIndex: 0,
    playbackSpeed: 1,
    isPlaying: false,
  };
}

export function buildObserverTimeline(
  run: WorkflowRunRecord,
): ObserverTimeline {
  const frames: ObserverTimelineFrame[] = [];
  const nodeIds = new Set(run.nodes?.map((node) => node.nodeId));
  for (const nodeId of run.stats.criticalPath ?? []) {
    nodeIds.add(nodeId);
  }
  const baselineStatuses: Record<string, NodeRunStatus> = {};
  for (const nodeId of nodeIds) {
    baselineStatuses[nodeId] = 'queued';
  }

  frames.push(
    attachTimelineMetadata(
      {
        index: 0,
        timestamp: run.startedAt ?? new Date().toISOString(),
        nodeStatuses: { ...baselineStatuses },
        costUSD: 0,
        latencyMs: 0,
        criticalPath: [],
      },
      nodeIds.size,
    ),
  );

  const events = buildNodeEvents(run);
  let index = 1;
  for (const event of events) {
    const previous = { ...frames[frames.length - 1].nodeStatuses };
    previous[event.nodeId] = event.status;
    frames.push(
      attachTimelineMetadata(
        {
          index,
          timestamp: event.timestamp,
          nodeStatuses: previous,
          costUSD: interpolateCost(run.stats.costUSD, index, events.length),
          latencyMs: interpolateLatency(
            run.stats.latencyMs,
            index,
            events.length,
          ),
          criticalPath: run.stats.criticalPath,
          delta: { nodeId: event.nodeId, status: event.status },
        },
        nodeIds.size,
      ),
    );
    index += 1;
  }

  frames.push(
    attachTimelineMetadata(
      {
        index,
        timestamp: run.finishedAt ?? new Date().toISOString(),
        nodeStatuses: { ...frames[frames.length - 1].nodeStatuses },
        costUSD: run.stats.costUSD,
        latencyMs: run.stats.latencyMs,
        criticalPath: run.stats.criticalPath,
      },
      nodeIds.size,
    ),
  );

  return { frames };
}

export function buildDependencyGraphSnapshot(
  state: CanvasState,
  frame?: ObserverTimelineFrame,
): DependencyGraphSnapshot {
  const nodeStatuses: Record<string, NodeRunStatus> = {};
  for (const node of state.workflow.nodes) {
    const runtimeStatus = state.runtime[node.id]?.status;
    nodeStatuses[node.id] =
      frame?.nodeStatuses[node.id] ?? runtimeStatus ?? 'queued';
  }

  const { counts, progressPercent } = summarizeStatuses(
    nodeStatuses,
    state.workflow.nodes.length,
  );

  const dependencies = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  for (const edge of state.workflow.edges) {
    if (!dependencies.has(edge.to)) {
      dependencies.set(edge.to, []);
    }
    if (!dependents.has(edge.from)) {
      dependents.set(edge.from, []);
    }
    dependencies.get(edge.to)!.push(edge.from);
    dependents.get(edge.from)!.push(edge.to);
  }

  const criticalPath = frame?.criticalPath ?? state.criticalPath;
  const criticalSet = new Set(criticalPath);
  const criticalPairs = new Set<string>();
  if (criticalPath) {
    for (let i = 0; i < criticalPath.length - 1; i += 1) {
      const from = criticalPath[i]!;
      const to = criticalPath[i + 1]!;
      criticalPairs.add(buildEdgePairKey(from, to));
    }
  }

  const positions = Object.keys(state.positions).length
    ? state.positions
    : constraintAwareAutoLayout(state.workflow);

  const nodes: DependencyGraphNodeState[] = state.workflow.nodes.map((node) => {
    const status = nodeStatuses[node.id] ?? 'queued';
    const deps = dependencies.get(node.id) ?? [];
    const nodePosition = positions[node.id] ?? {
      x: 0,
      y: 0,
      column: 0,
      lane: 0,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    };
    const completedDeps = deps.filter((dependencyId) =>
      isCompletedStatus(nodeStatuses[dependencyId]),
    );
    const isBlocked =
      status === 'queued' &&
      completedDeps.length !== deps.length &&
      deps.length > 0;
    return {
      id: node.id,
      label: node.name ?? node.id,
      status,
      column: nodePosition.column,
      lane: nodePosition.lane,
      position: nodePosition,
      dependencies: [...deps],
      dependents: [...(dependents.get(node.id) ?? [])],
      isCritical: criticalSet.has(node.id),
      isBlocked,
      startedAt: state.runtime[node.id]?.startedAt,
      finishedAt: state.runtime[node.id]?.finishedAt,
    };
  });

  const edges: DependencyGraphEdgeState[] = state.workflow.edges.map((edge) => {
    const id = serializeEdge(edge.from, edge.to, edge.on);
    const sourceStatus = nodeStatuses[edge.from] ?? 'queued';
    return {
      id,
      from: edge.from,
      to: edge.to,
      condition: edge.on,
      isCritical: criticalPairs.has(buildEdgePairKey(edge.from, edge.to)),
      isSatisfied: isCompletedStatus(sourceStatus),
    };
  });

  return {
    nodes,
    edges,
    statusCounts: counts,
    progressPercent,
  };
}

export function advancePlayback(
  state: ObserverState,
  options: PlaybackOptions = {},
): ObserverState {
  const direction = options.direction === 'backward' ? -1 : 1;
  const step = options.step ?? 1;
  const nextIndex = state.currentIndex + direction * step;
  if (options.loop) {
    const total = state.timeline.frames.length;
    const normalized = ((nextIndex % total) + total) % total;
    return { ...state, currentIndex: normalized };
  }
  return {
    ...state,
    currentIndex: Math.max(
      0,
      Math.min(nextIndex, state.timeline.frames.length - 1),
    ),
  };
}

export function constraintAwareAutoLayout(
  workflow: WorkflowDefinition,
  options: LayoutOptions = {},
): Record<string, CanvasNodePosition> {
  const estimates = computeWorkflowEstimates(workflow);
  return computeConstraintAwareLayout(
    workflow,
    options,
    estimates.criticalPath,
  );
}

function computeConstraintAwareLayout(
  workflow: WorkflowDefinition,
  options: LayoutOptions,
  criticalPath: string[],
): Record<string, CanvasNodePosition> {
  const columnSpacing = options.columnSpacing ?? 280;
  const rowSpacing = options.rowSpacing ?? 180;
  const laneSpacing = options.laneSpacing ?? rowSpacing;
  const criticalLane = options.criticalLane ?? 0;

  const { order } = topologicalSort(workflow);
  const incoming = new Map<string, Set<string>>();
  for (const edge of workflow.edges) {
    if (!incoming.has(edge.to)) {
      incoming.set(edge.to, new Set());
    }
    incoming.get(edge.to)!.add(edge.from);
  }

  const columnByNode = new Map<string, number>();
  const laneUsage = new Map<number, number>();
  const poolLane = new Map<string, number>();
  const positions: Record<string, CanvasNodePosition> = {};
  const criticalSet = new Set(criticalPath);

  for (const nodeId of order) {
    const node = workflow.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      continue;
    }
    let column = 0;
    for (const parent of incoming.get(nodeId) ?? []) {
      column = Math.max(column, (columnByNode.get(parent) ?? 0) + 1);
    }
    columnByNode.set(nodeId, column);

    let lane: number;
    if (criticalSet.has(nodeId)) {
      lane = criticalLane;
    } else if (node.pool) {
      if (!poolLane.has(node.pool)) {
        const nextLane = (laneUsage.get(-1) ?? 0) + 1;
        poolLane.set(node.pool, nextLane);
        laneUsage.set(-1, nextLane);
      }
      lane = poolLane.get(node.pool)!;
    } else {
      const used = laneUsage.get(column) ?? (criticalSet.size > 0 ? 1 : 0);
      lane = criticalSet.has(nodeId) ? criticalLane : used;
      if (!criticalSet.has(nodeId)) {
        laneUsage.set(column, used + 1);
      }
    }

    positions[nodeId] = {
      x: column * columnSpacing,
      y: lane * laneSpacing,
      column,
      lane,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    };
  }

  return positions;
}

function serializeEdge(from: string, to: string, condition: string): string {
  return `${from}->${to}:${condition}`;
}

interface NodeEvent {
  nodeId: string;
  status: NodeRunStatus;
  timestamp: string;
}

function buildNodeEvents(run: WorkflowRunRecord): NodeEvent[] {
  const events: NodeEvent[] = [];
  for (const node of run.nodes ?? []) {
    if (node.startedAt) {
      events.push({
        nodeId: node.nodeId,
        status: 'running',
        timestamp: node.startedAt,
      });
    }
    if (node.finishedAt) {
      events.push({
        nodeId: node.nodeId,
        status: node.status,
        timestamp: node.finishedAt,
      });
    }
  }
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

function interpolateCost(
  total: number,
  index: number,
  totalEvents: number,
): number {
  if (totalEvents === 0) {
    return total;
  }
  return Number(((total * index) / totalEvents).toFixed(2));
}

function interpolateLatency(
  total: number,
  index: number,
  totalEvents: number,
): number {
  if (totalEvents === 0) {
    return total;
  }
  return Math.round((total * index) / totalEvents);
}

function attachTimelineMetadata(
  frame: Omit<ObserverTimelineFrame, 'statusCounts' | 'progressPercent'>,
  totalNodes: number,
): ObserverTimelineFrame {
  const { counts, progressPercent } = summarizeStatuses(
    frame.nodeStatuses,
    totalNodes,
  );
  return {
    ...frame,
    statusCounts: counts,
    progressPercent,
  };
}

function summarizeStatuses(
  nodeStatuses: Record<string, NodeRunStatus>,
  totalNodes: number,
): { counts: TimelineStatusCounts; progressPercent: number } {
  const counts: TimelineStatusCounts = {
    total: totalNodes,
    completed: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    running: 0,
    queued: 0,
  };

  for (const status of Object.values(nodeStatuses)) {
    switch (status) {
      case 'succeeded':
        counts.succeeded += 1;
        counts.completed += 1;
        break;
      case 'skipped':
        counts.skipped += 1;
        counts.completed += 1;
        break;
      case 'failed':
        counts.failed += 1;
        counts.completed += 1;
        break;
      case 'running':
        counts.running += 1;
        break;
      case 'queued':
      default:
        counts.queued += 1;
        break;
    }
  }

  const progressPercent =
    totalNodes === 0
      ? 100
      : Math.round((counts.completed / Math.max(totalNodes, 1)) * 100);

  return { counts, progressPercent };
}

function isCompletedStatus(status: NodeRunStatus | undefined): boolean {
  return status === 'succeeded' || status === 'skipped' || status === 'failed';
}

function buildEdgePairKey(from: string, to: string): string {
  return `${from}->${to}`;
}
