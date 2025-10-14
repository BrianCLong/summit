import { describe, expect, it, vi } from 'vitest';
import type { WorkflowDefinition, WorkflowRunRecord } from 'common-types';
import {
  advancePlayback,
  applyRunUpdate,
  autoLayout,
  computeWorkflowDiff,
  constraintAwareAutoLayout,
  createCanvasState,
  createObserverState,
  buildDependencyGraphSnapshot
} from '../src/index.js';

vi.mock('policy', () => ({
  computeWorkflowEstimates: (workflow: WorkflowDefinition) => ({
    criticalPath: workflow.nodes.map(node => node.id),
    totalLatencyMs: 0,
    totalCostUSD: 0
  }),
  topologicalSort: (workflow: WorkflowDefinition) => ({
    order: workflow.nodes.map(node => node.id)
  }),
  validateWorkflow: (workflow: WorkflowDefinition) => ({
    normalized: workflow,
    analysis: {
      estimated: {
        criticalPath: workflow.nodes.map(node => node.id)
      }
    },
    warnings: []
  })
}));

function buildWorkflow(): WorkflowDefinition {
  return {
    workflowId: 'wf-web',
    tenantId: 'tenant-x',
    name: 'canvas',
    version: 1,
    policy: {
      purpose: 'engineering',
      retention: 'standard-365d',
      licenseClass: 'MIT-OK',
      pii: false
    },
    constraints: { latencyP95Ms: 100000, budgetUSD: 15 },
    nodes: [
      { id: 'source', type: 'git.clone', params: {}, estimates: { latencyP95Ms: 1000 } },
      { id: 'build', type: 'build.compile', params: {}, estimates: { latencyP95Ms: 2000 } },
      { id: 'test', type: 'test.junit', params: {}, estimates: { latencyP95Ms: 3000 } }
    ],
    edges: [
      { from: 'source', to: 'build', on: 'success' },
      { from: 'build', to: 'test', on: 'success' }
    ]
  };
}

describe('canvas utilities', () => {
  it('auto layouts critical path', () => {
    const state = createCanvasState(buildWorkflow());
    expect(Object.keys(state.positions).length).toBe(3);
    expect(state.positions.source.column).toBe(0);
    expect(state.positions.build.column).toBe(1);
    expect(state.positions.test.column).toBe(2);
    expect(state.positions.source.lane).toBe(0);
    expect(state.criticalPath.length).toBe(3);
  });

  it('autoLayout respects custom spacing', () => {
    const initial = createCanvasState(buildWorkflow());
    const updated = autoLayout(initial, { columnSpacing: 400, laneSpacing: 200 });
    expect(updated.positions.build.x).toBe(400);
    expect(updated.positions.build.y).toBe(0);
  });

  it('constraintAwareAutoLayout exposes helper', () => {
    const layout = constraintAwareAutoLayout(buildWorkflow(), { columnSpacing: 300 });
    expect(layout.test.x).toBe(600);
  });

  it('computeWorkflowDiff reports structural changes', () => {
    const current = buildWorkflow();
    const next = buildWorkflow();
    next.nodes.push({ id: 'lint', type: 'quality.lint', params: {} });
    next.edges.push({ from: 'test', to: 'lint', on: 'success' });
    const diff = computeWorkflowDiff(current, next);
    expect(diff.addedNodes).toEqual(['lint']);
    expect(diff.removedNodes.length).toBe(0);
    expect(diff.addedEdges.length).toBe(1);
  });

  it('observer state builds timeline from run', () => {
    const workflow = buildWorkflow();
    const run: WorkflowRunRecord = {
      runId: 'run-1',
      workflowId: workflow.workflowId,
      version: workflow.version,
      status: 'succeeded',
      stats: {
        latencyMs: 6000,
        costUSD: 4.2,
        criticalPath: ['source', 'build', 'test']
      },
      nodes: [
        {
          nodeId: 'source',
          status: 'succeeded',
          startedAt: '2024-01-01T00:00:00Z',
          finishedAt: '2024-01-01T00:02:00Z'
        },
        {
          nodeId: 'build',
          status: 'running',
          startedAt: '2024-01-01T00:02:00Z'
        },
        {
          nodeId: 'test',
          status: 'queued'
        }
      ]
    };

    const observer = createObserverState(run);
    expect(observer.timeline.frames.length).toBeGreaterThanOrEqual(4);
    const [baseline, firstDelta] = observer.timeline.frames;
    expect(baseline.progressPercent).toBe(0);
    expect(firstDelta.delta).toEqual({ nodeId: 'source', status: 'running' });
    expect(firstDelta.statusCounts.running).toBe(1);
    const secondDelta = observer.timeline.frames[2];
    expect(secondDelta.delta).toEqual({ nodeId: 'source', status: 'succeeded' });
    expect(secondDelta.progressPercent).toBe(33);
    const advanced = advancePlayback(observer, { step: 2 });
    expect(advanced.currentIndex).toBe(2);
    const looped = advancePlayback(observer, { direction: 'backward', loop: true });
    expect(looped.currentIndex).toBeGreaterThanOrEqual(0);
  });

  it('applyRunUpdate overlays runtime statuses', () => {
    const state = createCanvasState(buildWorkflow());
    const run: WorkflowRunRecord = {
      runId: 'run-2',
      workflowId: state.workflow.workflowId,
      version: state.workflow.version,
      status: 'running',
      stats: {
        latencyMs: 0,
        costUSD: 0,
        criticalPath: []
      },
      nodes: [
        { nodeId: 'build', status: 'running' },
        { nodeId: 'test', status: 'queued' }
      ]
    };

    const withRuntime = applyRunUpdate(state, run);
    expect(withRuntime.runtime.build.status).toBe('running');
    expect(withRuntime.runtime.test.status).toBe('queued');
  });

  it('builds dependency graph snapshot with progress summary', () => {
    const workflow = buildWorkflow();
    const initial = createCanvasState(workflow);
    const run: WorkflowRunRecord = {
      runId: 'run-graph',
      workflowId: workflow.workflowId,
      version: workflow.version,
      status: 'running',
      stats: {
        latencyMs: 4000,
        costUSD: 3.1,
        criticalPath: ['source', 'build', 'test']
      },
      nodes: [
        {
          nodeId: 'source',
          status: 'succeeded',
          startedAt: '2024-01-01T00:00:00Z',
          finishedAt: '2024-01-01T00:01:00Z'
        },
        {
          nodeId: 'build',
          status: 'running',
          startedAt: '2024-01-01T00:01:00Z'
        },
        {
          nodeId: 'test',
          status: 'queued'
        }
      ]
    };

    const observer = createObserverState(run);
    const stateWithRuntime = applyRunUpdate(initial, run);
    const latestFrame = observer.timeline.frames.at(-1);
    expect(latestFrame).toBeDefined();
    const snapshot = buildDependencyGraphSnapshot(stateWithRuntime, latestFrame);

    expect(snapshot.statusCounts.total).toBe(3);
    expect(snapshot.statusCounts.succeeded).toBe(1);
    expect(snapshot.statusCounts.running).toBe(1);
    expect(snapshot.progressPercent).toBe(33);

    const sourceNode = snapshot.nodes.find(node => node.id === 'source');
    const testNode = snapshot.nodes.find(node => node.id === 'test');
    expect(sourceNode?.isCritical).toBe(true);
    expect(sourceNode?.isBlocked).toBe(false);
    expect(testNode?.dependencies).toEqual(['build']);
    expect(testNode?.isBlocked).toBe(true);

    const satisfiedEdge = snapshot.edges.find(edge => edge.from === 'source' && edge.to === 'build');
    expect(satisfiedEdge?.isSatisfied).toBe(true);
  });
});
