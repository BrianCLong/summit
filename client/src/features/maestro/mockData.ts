import { addMinutes, formatISO } from 'date-fns';

export type PipelineStatus = 'healthy' | 'degraded' | 'failed';

export interface PipelineRecord {
  id: string;
  name: string;
  owners: string[];
  status: PipelineStatus;
  lastRun: string;
  leadTimeMinutes: number;
  dora: {
    deploymentFrequency: number;
    changeFailureRate: number;
    mttrMinutes: number;
    leadTimeMinutes: number;
  };
  costPerRun: number;
  queueDepth: number;
}

export interface PipelineNode {
  id: string;
  label: string;
  critical: boolean;
  durationMs: number;
  x: number;
  y: number;
  owners: string[];
  slaMinutes: number;
  flakyScore: number;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  critical: boolean;
}

export interface RunMetadata {
  id: string;
  commit: string;
  branch: string;
  initiator: string;
  environment: string;
  durationSeconds: number;
  retries: number;
  startedAt: string;
  status: 'running' | 'passed' | 'failed';
}

export interface ReleaseTrain {
  id: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  status: 'scheduled' | 'running' | 'completed' | 'blocked';
  gateStatus: 'pass' | 'fail' | 'pending';
  approvalsRequired: number;
  approvalsComplete: number;
}

export interface SloSnapshot {
  service: string;
  latencyP95Ms: number;
  errorRate: number;
  saturation: number;
}

const owners = ['alex', 'casey', 'devon', 'jules', 'morgan'];

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildPipelines(total: number): PipelineRecord[] {
  const now = new Date();
  return Array.from({ length: total }, (_, index) => {
    const id = `pipe-${index + 1}`;
    const statusPool: PipelineStatus[] = ['healthy', 'degraded', 'failed'];
    const status = statusPool[Math.floor(Math.random() * statusPool.length)];
    const lastRun = addMinutes(now, -Math.floor(Math.random() * 720));
    const queueDepth = Math.floor(Math.random() * 12);

    return {
      id,
      name: `Pipeline ${index + 1}`,
      owners: [randomChoice(owners), randomChoice(owners)].filter(
        (v, idx, arr) => arr.indexOf(v) === idx,
      ),
      status,
      lastRun: formatISO(lastRun),
      leadTimeMinutes: 30 + Math.floor(Math.random() * 120),
      dora: {
        deploymentFrequency: 4 + Math.floor(Math.random() * 8),
        changeFailureRate: Math.round(Math.random() * 20),
        mttrMinutes: 20 + Math.floor(Math.random() * 120),
        leadTimeMinutes: 30 + Math.floor(Math.random() * 180),
      },
      costPerRun: 25 + Math.random() * 140,
      queueDepth,
    } satisfies PipelineRecord;
  });
}

function buildPipelineGraph(nodeCount: number) {
  const nodes: PipelineNode[] = Array.from({ length: nodeCount }, (_, idx) => {
    const row = Math.floor(idx / 10);
    const col = idx % 10;
    return {
      id: `node-${idx + 1}`,
      label: `Step ${idx + 1}`,
      critical: idx % 11 === 0,
      durationMs: 5000 + Math.floor(Math.random() * 12000),
      x: col * 160,
      y: row * 140,
      owners: [randomChoice(owners)],
      slaMinutes: 15 + Math.floor(Math.random() * 45),
      flakyScore: Math.round(Math.random() * 100) / 100,
    } satisfies PipelineNode;
  });

  const edges: PipelineEdge[] = [];
  for (let idx = 0; idx < nodeCount - 1; idx += 1) {
    edges.push({
      id: `edge-${idx + 1}`,
      source: `node-${idx + 1}`,
      target: `node-${idx + 2}`,
      critical: idx % 11 === 0,
    });
    if (idx + 10 < nodeCount) {
      edges.push({
        id: `edge-${idx + 1}-alt`,
        source: `node-${idx + 1}`,
        target: `node-${idx + 11}`,
        critical: false,
      });
    }
  }

  return { nodes, edges };
}

function buildRuns(): RunMetadata[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, idx) => ({
    id: `run-${idx + 1}`,
    commit: `c${(1000 + idx).toString(16)}`,
    branch: idx % 2 === 0 ? 'main' : 'release/2025.09',
    initiator: idx % 3 === 0 ? 'build-bot' : randomChoice(owners),
    environment:
      idx % 4 === 0 ? 'production' : idx % 4 === 1 ? 'staging' : 'dev',
    durationSeconds: 360 + Math.floor(Math.random() * 900),
    retries: idx % 5 === 0 ? 1 : 0,
    startedAt: formatISO(addMinutes(now, -idx * 120)),
    status: idx % 6 === 0 ? 'failed' : idx % 3 === 0 ? 'running' : 'passed',
  }));
}

function buildReleases(): ReleaseTrain[] {
  const now = new Date();
  return [
    {
      id: 'release-1',
      name: 'Release Train Alpha',
      windowStart: formatISO(addMinutes(now, -180)),
      windowEnd: formatISO(addMinutes(now, 60)),
      status: 'running',
      gateStatus: 'pending',
      approvalsRequired: 4,
      approvalsComplete: 2,
    },
    {
      id: 'release-2',
      name: 'Release Train Beta',
      windowStart: formatISO(addMinutes(now, 240)),
      windowEnd: formatISO(addMinutes(now, 480)),
      status: 'scheduled',
      gateStatus: 'pending',
      approvalsRequired: 3,
      approvalsComplete: 0,
    },
    {
      id: 'release-0',
      name: 'Release Train Omega',
      windowStart: formatISO(addMinutes(now, -720)),
      windowEnd: formatISO(addMinutes(now, -300)),
      status: 'completed',
      gateStatus: 'pass',
      approvalsRequired: 3,
      approvalsComplete: 3,
    },
  ];
}

function buildSloSnapshots(): SloSnapshot[] {
  return [
    {
      service: 'pipeline-api',
      latencyP95Ms: 820,
      errorRate: 0.002,
      saturation: 0.61,
    },
    {
      service: 'artifact-proxy',
      latencyP95Ms: 1340,
      errorRate: 0.006,
      saturation: 0.72,
    },
    {
      service: 'policy-engine',
      latencyP95Ms: 640,
      errorRate: 0.001,
      saturation: 0.55,
    },
  ];
}

export const pipelineRecords = buildPipelines(2000);
export const pipelineGraph = buildPipelineGraph(200);
export const runRecords = buildRuns();
export const releaseTrains = buildReleases();
export const sloSnapshots = buildSloSnapshots();

export const policyDenials = [
  {
    id: 'denial-1',
    tenant: 'acme-co',
    reason: 'Promotion blocked: missing change ticket',
    occurredAt: formatISO(addMinutes(new Date(), -45)),
  },
  {
    id: 'denial-2',
    tenant: 'aurora-labs',
    reason: 'Artifact export denied: PII redaction required',
    occurredAt: formatISO(addMinutes(new Date(), -12)),
  },
];

export const queueDepthHistory = Array.from({ length: 12 }, (_, idx) => ({
  hour: idx,
  depth: 5 + Math.floor(Math.random() * 20),
}));

export const sloBudget = {
  latencyBudgetMs: 1500,
  errorBudget: 0.01,
};
