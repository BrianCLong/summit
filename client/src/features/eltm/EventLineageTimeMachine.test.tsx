import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventLineageTimeMachine from './EventLineageTimeMachine';
import type { LineageSnapshot, LineageDiff, ReplayManifest, SnapshotSummary } from './types';

declare global {
  // eslint-disable-next-line no-var
  var ResizeObserver: any;
}

const summaries: SnapshotSummary[] = [
  {
    id: 'run-a',
    jobName: 'daily_metrics_build',
    label: 'Run A',
    commitSha: 'aaa1111',
    capturedAt: '2025-03-01T12:00:00.000Z',
    triggeredBy: 'scheduler',
    metrics: { runDurationSeconds: 900, outputRecords: 100_000, dataFreshnessHours: 4 },
    manifestChecksum: 'checksum-a',
  },
  {
    id: 'run-b',
    jobName: 'daily_metrics_build',
    label: 'Run B',
    commitSha: 'bbb2222',
    capturedAt: '2025-03-02T12:00:00.000Z',
    triggeredBy: 'scheduler',
    metrics: { runDurationSeconds: 840, outputRecords: 120_000, dataFreshnessHours: 3 },
    manifestChecksum: 'checksum-b',
  },
];

const baseReplay = {
  orchestratorImage: 'orchestrator:1',
  entrypoint: 'pipeline.py',
  environment: { PROFILE: 'daily' },
  parameters: [
    {
      key: 'window_days',
      value: '7',
      description: 'Window length',
      source: 'git',
      locked: true,
      checksum: 'param-checksum',
    },
  ],
  inputs: [
    {
      datasetId: 'dataset-input',
      version: 'v1',
      uri: 's3://input',
      format: 'parquet',
      sizeBytes: 100,
      checksum: 'input-checksum',
      locked: true,
    },
  ],
  outputs: [
    {
      datasetId: 'dataset-output',
      version: 'v1',
      uri: 's3://output',
      format: 'delta',
      sizeBytes: 50,
      checksum: 'output-checksum',
    },
  ],
  policies: [],
};

const snapshotA: LineageSnapshot = {
  ...summaries[0],
  nodes: [
    { id: 'dataset-input', type: 'dataset', name: 'raw_events', version: 'v1' },
    { id: 'transform-normalize', type: 'transform', name: 'normalize', version: '1.0.0' },
    { id: 'dataset-output', type: 'output', name: 'daily_metrics', version: 'v1' },
  ],
  edges: [
    { id: 'edge-a', source: 'dataset-input', target: 'transform-normalize', relationship: 'consumes' },
    { id: 'edge-b', source: 'transform-normalize', target: 'dataset-output', relationship: 'produces' },
  ],
  replay: baseReplay,
};

const snapshotB: LineageSnapshot = {
  ...summaries[1],
  nodes: [
    { id: 'dataset-input', type: 'dataset', name: 'raw_events', version: 'v2' },
    { id: 'transform-normalize', type: 'transform', name: 'normalize', version: '1.1.0' },
    { id: 'dataset-new', type: 'dataset', name: 'enriched_events', version: 'v1' },
    { id: 'dataset-output', type: 'output', name: 'daily_metrics', version: 'v2' },
  ],
  edges: [
    { id: 'edge-a', source: 'dataset-input', target: 'transform-normalize', relationship: 'consumes' },
    { id: 'edge-new', source: 'transform-normalize', target: 'dataset-new', relationship: 'produces' },
    { id: 'edge-b', source: 'dataset-new', target: 'dataset-output', relationship: 'produces' },
  ],
  replay: {
    ...baseReplay,
    inputs: [
      ...baseReplay.inputs,
      {
        datasetId: 'dataset-new',
        version: 'v1',
        uri: 's3://enriched',
        format: 'delta',
        sizeBytes: 10,
        checksum: 'enriched-checksum',
        locked: true,
      },
    ],
    outputs: [
      {
        datasetId: 'dataset-output',
        version: 'v2',
        uri: 's3://output-v2',
        format: 'delta',
        sizeBytes: 60,
        checksum: 'output-v2-checksum',
      },
    ],
  },
};

const diffPayload: LineageDiff = {
  sourceRunId: 'run-a',
  targetRunId: 'run-b',
  summary: {
    addedNodes: 1,
    removedNodes: 0,
    changedNodes: 2,
    addedEdges: 1,
    removedEdges: 0,
    changedEdges: 0,
  },
  nodeDiff: {
    added: [snapshotB.nodes.find((node) => node.id === 'dataset-new')!],
    removed: [],
    changed: [
      {
        nodeId: 'dataset-input',
        before: snapshotA.nodes.find((node) => node.id === 'dataset-input')!,
        after: snapshotB.nodes.find((node) => node.id === 'dataset-input')!,
        changedFields: ['version'],
      },
      {
        nodeId: 'transform-normalize',
        before: snapshotA.nodes.find((node) => node.id === 'transform-normalize')!,
        after: snapshotB.nodes.find((node) => node.id === 'transform-normalize')!,
        changedFields: ['version'],
      },
    ],
    unchanged: ['dataset-output'],
  },
  edgeDiff: {
    added: [snapshotB.edges.find((edge) => edge.id === 'edge-new')!],
    removed: [],
    unchanged: ['edge-a', 'edge-b'],
  },
  sourceNodeStatus: {
    'dataset-input': 'changed',
    'transform-normalize': 'changed',
    'dataset-output': 'unchanged',
  },
  targetNodeStatus: {
    'dataset-input': 'changed',
    'transform-normalize': 'changed',
    'dataset-output': 'unchanged',
    'dataset-new': 'added',
  },
  sourceEdgeStatus: {
    'edge-a': 'unchanged',
    'edge-b': 'unchanged',
  },
  targetEdgeStatus: {
    'edge-a': 'unchanged',
    'edge-b': 'unchanged',
    'edge-new': 'added',
  },
};

const manifestResponse: ReplayManifest = {
  runId: snapshotB.id,
  jobName: snapshotB.jobName,
  commitSha: snapshotB.commitSha,
  capturedAt: snapshotB.capturedAt,
  orchestratorImage: snapshotB.replay.orchestratorImage,
  entrypoint: snapshotB.replay.entrypoint,
  environment: snapshotB.replay.environment,
  inputs: snapshotB.replay.inputs,
  parameters: snapshotB.replay.parameters,
  outputs: snapshotB.replay.outputs,
  policies: snapshotB.replay.policies,
  artifactChecksum: 'checksum-b',
};

const createMockFetch = () =>
  jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith('/api/eltm/snapshots') && (!init || init.method === undefined)) {
      return { ok: true, status: 200, json: async () => ({ snapshots: summaries }) } as Response;
    }
    if (url.includes('/api/eltm/snapshots/run-b')) {
      return { ok: true, status: 200, json: async () => ({ snapshot: snapshotB }) } as Response;
    }
    if (url.includes('/api/eltm/snapshots/run-a')) {
      return { ok: true, status: 200, json: async () => ({ snapshot: snapshotA }) } as Response;
    }
    if (url.endsWith('/api/eltm/diff')) {
      return { ok: true, status: 200, json: async () => ({ diff: diffPayload }) } as Response;
    }
    if (url.includes('/api/eltm/replay-manifest/')) {
      return { ok: true, status: 200, json: async () => ({ manifest: manifestResponse }) } as Response;
    }
    throw new Error(`Unhandled fetch to ${url}`);
  });

describe('EventLineageTimeMachine', () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    (global as any).fetch = createMockFetch();
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:mock');
    (global as any).URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete (global as any).fetch;
  });

  it('supports keyboard navigation to inspect historical runs', async () => {
    render(<EventLineageTimeMachine />);
    const slider = await screen.findByRole('slider', { name: /lineage snapshot timeline/i });
    slider.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await screen.findByText(/Selected run:.*Run A/i);
  });

  it('exports replay manifest and surfaces success feedback', async () => {
    render(<EventLineageTimeMachine />);
    const exportButton = await screen.findByRole('button', { name: /export replay manifest/i });
    await userEvent.click(exportButton);
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.some(([url]: [string]) => url.includes('/replay-manifest/'))).toBe(true);
    });
    await screen.findByText(/Replay manifest locked to checksum/i);
    expect((global as any).URL.createObjectURL).toHaveBeenCalled();
  });
});
