"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCanvasState = createCanvasState;
exports.autoLayout = autoLayout;
exports.updateNodePosition = updateNodePosition;
exports.selectNodes = selectNodes;
exports.applyRunUpdate = applyRunUpdate;
exports.computeWorkflowDiff = computeWorkflowDiff;
exports.createObserverState = createObserverState;
exports.buildObserverTimeline = buildObserverTimeline;
exports.buildDependencyGraphSnapshot = buildDependencyGraphSnapshot;
exports.advancePlayback = advancePlayback;
exports.constraintAwareAutoLayout = constraintAwareAutoLayout;
const policy_1 = require("policy");
const DEFAULT_NODE_WIDTH = 260;
const DEFAULT_NODE_HEIGHT = 140;
function createCanvasState(workflow) {
    const validation = (0, policy_1.validateWorkflow)(workflow);
    const criticalPath = validation.analysis.estimated.criticalPath;
    const positions = computeConstraintAwareLayout(validation.normalized, { criticalLane: 0 }, criticalPath);
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
function autoLayout(state, options = {}) {
    const criticalPath = state.validation.analysis.estimated.criticalPath;
    const positions = computeConstraintAwareLayout(state.workflow, options, criticalPath);
    return {
        ...state,
        positions,
    };
}
function updateNodePosition(state, nodeId, patch) {
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
function selectNodes(state, nodeIds) {
    return {
        ...state,
        selectedNodeIds: [...new Set(nodeIds)],
    };
}
function applyRunUpdate(state, run) {
    const runtime = { ...state.runtime };
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
function computeWorkflowDiff(current, next) {
    const currentNodeMap = new Map(current.nodes.map((node) => [node.id, node]));
    const nextNodeMap = new Map(next.nodes.map((node) => [node.id, node]));
    const addedNodes = [...nextNodeMap.keys()].filter((id) => !currentNodeMap.has(id));
    const removedNodes = [...currentNodeMap.keys()].filter((id) => !nextNodeMap.has(id));
    const changedNodes = [];
    for (const [id, node] of currentNodeMap.entries()) {
        if (!nextNodeMap.has(id)) {
            continue;
        }
        const candidate = nextNodeMap.get(id);
        if (node.type !== candidate.type ||
            JSON.stringify(node.params) !== JSON.stringify(candidate.params) ||
            JSON.stringify(node.evidenceOutputs ?? []) !==
                JSON.stringify(candidate.evidenceOutputs ?? [])) {
            changedNodes.push(id);
        }
    }
    const currentEdges = new Set(current.edges.map((edge) => serializeEdge(edge.from, edge.to, edge.on)));
    const nextEdges = new Set(next.edges.map((edge) => serializeEdge(edge.from, edge.to, edge.on)));
    const addedEdges = [...nextEdges].filter((edge) => !currentEdges.has(edge));
    const removedEdges = [...currentEdges].filter((edge) => !nextEdges.has(edge));
    return { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges };
}
function createObserverState(run) {
    const timeline = buildObserverTimeline(run);
    return {
        runId: run.runId,
        timeline,
        currentIndex: 0,
        playbackSpeed: 1,
        isPlaying: false,
    };
}
function buildObserverTimeline(run) {
    const frames = [];
    const nodeIds = new Set(run.nodes?.map((node) => node.nodeId));
    for (const nodeId of run.stats.criticalPath ?? []) {
        nodeIds.add(nodeId);
    }
    const baselineStatuses = {};
    for (const nodeId of nodeIds) {
        baselineStatuses[nodeId] = 'queued';
    }
    frames.push(attachTimelineMetadata({
        index: 0,
        timestamp: run.startedAt ?? new Date().toISOString(),
        nodeStatuses: { ...baselineStatuses },
        costUSD: 0,
        latencyMs: 0,
        criticalPath: [],
    }, nodeIds.size));
    const events = buildNodeEvents(run);
    let index = 1;
    for (const event of events) {
        const previous = { ...frames[frames.length - 1].nodeStatuses };
        previous[event.nodeId] = event.status;
        frames.push(attachTimelineMetadata({
            index,
            timestamp: event.timestamp,
            nodeStatuses: previous,
            costUSD: interpolateCost(run.stats.costUSD, index, events.length),
            latencyMs: interpolateLatency(run.stats.latencyMs, index, events.length),
            criticalPath: run.stats.criticalPath,
            delta: { nodeId: event.nodeId, status: event.status },
        }, nodeIds.size));
        index += 1;
    }
    frames.push(attachTimelineMetadata({
        index,
        timestamp: run.finishedAt ?? new Date().toISOString(),
        nodeStatuses: { ...frames[frames.length - 1].nodeStatuses },
        costUSD: run.stats.costUSD,
        latencyMs: run.stats.latencyMs,
        criticalPath: run.stats.criticalPath,
    }, nodeIds.size));
    return { frames };
}
function buildDependencyGraphSnapshot(state, frame) {
    const nodeStatuses = {};
    for (const node of state.workflow.nodes) {
        const runtimeStatus = state.runtime[node.id]?.status;
        nodeStatuses[node.id] =
            frame?.nodeStatuses[node.id] ?? runtimeStatus ?? 'queued';
    }
    const { counts, progressPercent } = summarizeStatuses(nodeStatuses, state.workflow.nodes.length);
    const dependencies = new Map();
    const dependents = new Map();
    for (const edge of state.workflow.edges) {
        if (!dependencies.has(edge.to)) {
            dependencies.set(edge.to, []);
        }
        if (!dependents.has(edge.from)) {
            dependents.set(edge.from, []);
        }
        dependencies.get(edge.to).push(edge.from);
        dependents.get(edge.from).push(edge.to);
    }
    const criticalPath = frame?.criticalPath ?? state.criticalPath;
    const criticalSet = new Set(criticalPath);
    const criticalPairs = new Set();
    if (criticalPath) {
        for (let i = 0; i < criticalPath.length - 1; i += 1) {
            const from = criticalPath[i];
            const to = criticalPath[i + 1];
            criticalPairs.add(buildEdgePairKey(from, to));
        }
    }
    const positions = Object.keys(state.positions).length
        ? state.positions
        : constraintAwareAutoLayout(state.workflow);
    const nodes = state.workflow.nodes.map((node) => {
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
        const completedDeps = deps.filter((dependencyId) => isCompletedStatus(nodeStatuses[dependencyId]));
        const isBlocked = status === 'queued' &&
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
    const edges = state.workflow.edges.map((edge) => {
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
function advancePlayback(state, options = {}) {
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
        currentIndex: Math.max(0, Math.min(nextIndex, state.timeline.frames.length - 1)),
    };
}
function constraintAwareAutoLayout(workflow, options = {}) {
    const estimates = (0, policy_1.computeWorkflowEstimates)(workflow);
    return computeConstraintAwareLayout(workflow, options, estimates.criticalPath);
}
function computeConstraintAwareLayout(workflow, options, criticalPath) {
    const columnSpacing = options.columnSpacing ?? 280;
    const rowSpacing = options.rowSpacing ?? 180;
    const laneSpacing = options.laneSpacing ?? rowSpacing;
    const criticalLane = options.criticalLane ?? 0;
    const { order } = (0, policy_1.topologicalSort)(workflow);
    const incoming = new Map();
    for (const edge of workflow.edges) {
        if (!incoming.has(edge.to)) {
            incoming.set(edge.to, new Set());
        }
        incoming.get(edge.to).add(edge.from);
    }
    const columnByNode = new Map();
    const laneUsage = new Map();
    const poolLane = new Map();
    const positions = {};
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
        let lane;
        if (criticalSet.has(nodeId)) {
            lane = criticalLane;
        }
        else if (node.pool) {
            if (!poolLane.has(node.pool)) {
                const nextLane = (laneUsage.get(-1) ?? 0) + 1;
                poolLane.set(node.pool, nextLane);
                laneUsage.set(-1, nextLane);
            }
            lane = poolLane.get(node.pool);
        }
        else {
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
function serializeEdge(from, to, condition) {
    return `${from}->${to}:${condition}`;
}
function buildNodeEvents(run) {
    const events = [];
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
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
function interpolateCost(total, index, totalEvents) {
    if (totalEvents === 0) {
        return total;
    }
    return Number(((total * index) / totalEvents).toFixed(2));
}
function interpolateLatency(total, index, totalEvents) {
    if (totalEvents === 0) {
        return total;
    }
    return Math.round((total * index) / totalEvents);
}
function attachTimelineMetadata(frame, totalNodes) {
    const { counts, progressPercent } = summarizeStatuses(frame.nodeStatuses, totalNodes);
    return {
        ...frame,
        statusCounts: counts,
        progressPercent,
    };
}
function summarizeStatuses(nodeStatuses, totalNodes) {
    const counts = {
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
    const progressPercent = totalNodes === 0
        ? 100
        : Math.round((counts.completed / Math.max(totalNodes, 1)) * 100);
    return { counts, progressPercent };
}
function isCompletedStatus(status) {
    return status === 'succeeded' || status === 'skipped' || status === 'failed';
}
function buildEdgePairKey(from, to) {
    return `${from}->${to}`;
}
