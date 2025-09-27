import { createHash } from 'crypto';

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

export interface ParameterLock {
  key: string;
  value: string;
  description: string;
  source: 'git' | 'runtime' | 'user';
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

export interface ReplayContextSeed {
  orchestratorImage: string;
  entrypoint: string;
  environment: Record<string, string>;
  parameters: ParameterLock[];
  inputs: ArtifactLock[];
  outputs: OutputArtifact[];
  policies: PolicyLock[];
}

export interface SnapshotMetrics {
  runDurationSeconds: number;
  outputRecords: number;
  dataFreshnessHours: number;
}

export interface SnapshotSeed {
  id: string;
  jobName: string;
  label: string;
  commitSha: string;
  capturedAt: string;
  triggeredBy: string;
  metrics: SnapshotMetrics;
  nodes: LineageNode[];
  edges: LineageEdge[];
  replay: ReplayContextSeed;
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

export interface LineageSnapshot extends SnapshotSeed {
  manifestChecksum: string;
}

const seeds: SnapshotSeed[] = [
  {
    id: 'eltm-run-20250301-1200Z',
    jobName: 'daily_metrics_build',
    label: 'Daily metrics build — Mar 01',
    commitSha: 'c9a14f2',
    capturedAt: '2025-03-01T12:00:00.000Z',
    triggeredBy: 'analytics-bot',
    metrics: {
      runDurationSeconds: 1840,
      outputRecords: 125_642,
      dataFreshnessHours: 4,
    },
    nodes: [
      {
        id: 'dataset-raw-events',
        type: 'dataset',
        name: 'raw_events',
        version: 'v2025.02.28',
        metadata: {
          format: 'parquet',
          rowCount: 5_250_000,
          location: 's3://analytics/raw-events/v2025-02-28/',
        },
      },
      {
        id: 'transform-normalize-events',
        type: 'transform',
        name: 'normalize_raw_events',
        version: 'etl@1.4.0',
        commitSha: 'c9a14f2',
        metadata: {
          image: 'analytics/etl-normalize:1.4.0',
          entrypoint: 'python pipelines/normalize.py',
        },
      },
      {
        id: 'dataset-clean-events',
        type: 'dataset',
        name: 'clean_events',
        version: 'v2025.02.28',
        metadata: {
          format: 'delta',
          rowCount: 5_190_000,
          location: 's3://analytics/clean-events/v2025-02-28/',
        },
        policies: ['policy-gdpr'],
      },
      {
        id: 'policy-gdpr',
        type: 'policy',
        name: 'GDPR data minimization',
        version: 'policy@2025.01',
        metadata: {
          owner: 'governance-team',
          enforcement: 'column-level-redaction',
        },
      },
      {
        id: 'transform-train-metrics',
        type: 'transform',
        name: 'train_daily_metrics',
        version: 'ml@3.2.0',
        commitSha: 'b8f3007',
        metadata: {
          image: 'analytics/train-metrics:3.2.0',
          entrypoint: 'python jobs/train_metrics.py',
        },
      },
      {
        id: 'dataset-daily-metrics',
        type: 'output',
        name: 'daily_metrics',
        version: 'v2025.03.01',
        metadata: {
          format: 'delta',
          location: 's3://analytics/daily-metrics/v2025-03-01/',
        },
      },
    ],
    edges: [
      {
        id: 'edge-raw-to-normalize',
        source: 'dataset-raw-events',
        target: 'transform-normalize-events',
        relationship: 'consumes',
        description: 'Raw events feed normalization pipeline',
      },
      {
        id: 'edge-normalize-to-clean',
        source: 'transform-normalize-events',
        target: 'dataset-clean-events',
        relationship: 'produces',
      },
      {
        id: 'edge-policy-gdpr',
        source: 'policy-gdpr',
        target: 'dataset-clean-events',
        relationship: 'governs',
        description: 'GDPR policy applied to clean dataset',
      },
      {
        id: 'edge-clean-to-train',
        source: 'dataset-clean-events',
        target: 'transform-train-metrics',
        relationship: 'consumes',
      },
      {
        id: 'edge-train-to-output',
        source: 'transform-train-metrics',
        target: 'dataset-daily-metrics',
        relationship: 'produces',
      },
    ],
    replay: {
      orchestratorImage: 'intelgraph/orchestrator:2.7.1',
      entrypoint: 'pipelines/daily_metrics.py',
      environment: {
        PYTHONHASHSEED: '0',
        ML_PROFILE: 'daily_metrics',
        NUM_THREADS: '16',
      },
      parameters: [
        {
          key: 'window_days',
          value: '7',
          description: 'Rolling window length for aggregation',
          source: 'git',
          locked: true,
          checksum: 'c4e1fa28b9fb6f8a9bd79d34e4f8c8f5f46e5dd6c4a1b12c28dbf89bb6fc9d52',
        },
        {
          key: 'minimum_sessions',
          value: '25',
          description: 'Session threshold for inclusion',
          source: 'user',
          locked: true,
          checksum: 'cdd0a6d4a6dd9f5cc2d13206a76a728536d9ebf2d4f2a17cc65c1dcaf1490489',
        },
      ],
      inputs: [
        {
          datasetId: 'dataset-raw-events',
          version: 'v2025.02.28',
          uri: 's3://analytics/raw-events/v2025-02-28/',
          format: 'parquet',
          sizeBytes: 128_450_221_184,
          checksum: '6c820b6b25271733b0f49b0b8e07052cd4908b5f05697cfefc2e4abf81d15f60',
          locked: true,
        },
        {
          datasetId: 'dataset-clean-events',
          version: 'v2025.02.28',
          uri: 's3://analytics/clean-events/v2025-02-28/',
          format: 'delta',
          sizeBytes: 68_214_431_744,
          checksum: 'c8841aa49da1c7c8ef44db2ebdff03f0af87eedf15bd8b7e3ee441fa8f8a661e',
          locked: true,
        },
      ],
      outputs: [
        {
          datasetId: 'dataset-daily-metrics',
          version: 'v2025.03.01',
          uri: 's3://analytics/daily-metrics/v2025-03-01/',
          format: 'delta',
          sizeBytes: 12_844_612_608,
          checksum: 'c75df89b8a8935483bf502ad9ed8ad0e265b1996efc8cb2d14a3d42562c6d1ab',
        },
      ],
      policies: [
        {
          id: 'policy-gdpr',
          name: 'GDPR data minimization',
          sha: 'policy-gdpr@2025.01',
          enforcedBy: 'opa-runtime@4.2.0',
        },
      ],
    },
  },
  {
    id: 'eltm-run-20250302-1200Z',
    jobName: 'daily_metrics_build',
    label: 'Daily metrics build — Mar 02',
    commitSha: 'd72b512',
    capturedAt: '2025-03-02T12:00:00.000Z',
    triggeredBy: 'analytics-bot',
    metrics: {
      runDurationSeconds: 1765,
      outputRecords: 129_401,
      dataFreshnessHours: 3,
    },
    nodes: [
      {
        id: 'dataset-raw-events',
        type: 'dataset',
        name: 'raw_events',
        version: 'v2025.03.01',
        metadata: {
          format: 'parquet',
          rowCount: 5_340_000,
          location: 's3://analytics/raw-events/v2025-03-01/',
        },
      },
      {
        id: 'transform-normalize-events',
        type: 'transform',
        name: 'normalize_raw_events',
        version: 'etl@1.4.1',
        commitSha: 'd72b512',
        metadata: {
          image: 'analytics/etl-normalize:1.4.1',
          entrypoint: 'python pipelines/normalize.py',
        },
      },
      {
        id: 'dataset-clean-events',
        type: 'dataset',
        name: 'clean_events',
        version: 'v2025.03.01',
        metadata: {
          format: 'delta',
          rowCount: 5_270_000,
          location: 's3://analytics/clean-events/v2025-03-01/',
        },
        policies: ['policy-gdpr'],
      },
      {
        id: 'dataset-enriched-events',
        type: 'dataset',
        name: 'enriched_events',
        version: 'v2025.03.01',
        metadata: {
          format: 'delta',
          rowCount: 2_845_000,
          location: 's3://analytics/enriched-events/v2025-03-01/',
        },
      },
      {
        id: 'transform-enrich-events',
        type: 'transform',
        name: 'enrich_events',
        version: 'etl@0.9.0',
        commitSha: '37b982c',
        metadata: {
          image: 'analytics/enrich-events:0.9.0',
          entrypoint: 'python pipelines/enrich.py',
        },
      },
      {
        id: 'policy-gdpr',
        type: 'policy',
        name: 'GDPR data minimization',
        version: 'policy@2025.01',
        metadata: {
          owner: 'governance-team',
          enforcement: 'column-level-redaction',
        },
      },
      {
        id: 'transform-train-metrics',
        type: 'transform',
        name: 'train_daily_metrics',
        version: 'ml@3.2.1',
        commitSha: 'f56aa1b',
        metadata: {
          image: 'analytics/train-metrics:3.2.1',
          entrypoint: 'python jobs/train_metrics.py',
        },
      },
      {
        id: 'dataset-daily-metrics',
        type: 'output',
        name: 'daily_metrics',
        version: 'v2025.03.02',
        metadata: {
          format: 'delta',
          location: 's3://analytics/daily-metrics/v2025-03-02/',
        },
      },
    ],
    edges: [
      {
        id: 'edge-raw-to-normalize',
        source: 'dataset-raw-events',
        target: 'transform-normalize-events',
        relationship: 'consumes',
        description: 'Raw events feed normalization pipeline',
      },
      {
        id: 'edge-normalize-to-clean',
        source: 'transform-normalize-events',
        target: 'dataset-clean-events',
        relationship: 'produces',
      },
      {
        id: 'edge-clean-to-enrich',
        source: 'dataset-clean-events',
        target: 'transform-enrich-events',
        relationship: 'consumes',
      },
      {
        id: 'edge-enrich-to-enriched',
        source: 'transform-enrich-events',
        target: 'dataset-enriched-events',
        relationship: 'produces',
      },
      {
        id: 'edge-enriched-to-train',
        source: 'dataset-enriched-events',
        target: 'transform-train-metrics',
        relationship: 'consumes',
      },
      {
        id: 'edge-policy-gdpr',
        source: 'policy-gdpr',
        target: 'dataset-clean-events',
        relationship: 'governs',
        description: 'GDPR policy applied to clean dataset',
      },
      {
        id: 'edge-train-to-output',
        source: 'transform-train-metrics',
        target: 'dataset-daily-metrics',
        relationship: 'produces',
      },
    ],
    replay: {
      orchestratorImage: 'intelgraph/orchestrator:2.7.1',
      entrypoint: 'pipelines/daily_metrics.py',
      environment: {
        PYTHONHASHSEED: '0',
        ML_PROFILE: 'daily_metrics',
        NUM_THREADS: '24',
      },
      parameters: [
        {
          key: 'window_days',
          value: '7',
          description: 'Rolling window length for aggregation',
          source: 'git',
          locked: true,
          checksum: 'c4e1fa28b9fb6f8a9bd79d34e4f8c8f5f46e5dd6c4a1b12c28dbf89bb6fc9d52',
        },
        {
          key: 'minimum_sessions',
          value: '20',
          description: 'Session threshold for inclusion',
          source: 'user',
          locked: true,
          checksum: 'd809f3a40d1695d9f2c7c57c0bdbb02d30b4c4de3d1ec2ef75d5f1a7dbeee4a3',
        },
        {
          key: 'feature_flag_enriched',
          value: 'true',
          description: 'Enable enrichment branch',
          source: 'runtime',
          locked: true,
          checksum: 'af0b88f0d9dfe0e2ea6a0207b9f1196c6f72b15fdcfd5a7dabcc9a1c7b0f4f6d',
        },
      ],
      inputs: [
        {
          datasetId: 'dataset-raw-events',
          version: 'v2025.03.01',
          uri: 's3://analytics/raw-events/v2025-03-01/',
          format: 'parquet',
          sizeBytes: 129_118_281_984,
          checksum: 'c2f1c3f4b3848f704d9d0d7e5c80e9fdb1b45c21010232c4a990e0c5e7d1d54e',
          locked: true,
        },
        {
          datasetId: 'dataset-clean-events',
          version: 'v2025.03.01',
          uri: 's3://analytics/clean-events/v2025-03-01/',
          format: 'delta',
          sizeBytes: 69_004_923_392,
          checksum: '8c4a8018b95f58f8c1b80e3c7c8b1fcf3ed464db2a69c82d39be2961e5dfdc1c',
          locked: true,
        },
        {
          datasetId: 'dataset-enriched-events',
          version: 'v2025.03.01',
          uri: 's3://analytics/enriched-events/v2025-03-01/',
          format: 'delta',
          sizeBytes: 24_410_118_144,
          checksum: '6f2ab7781d0bbbd203d4878f4c7c33ec3d5d69bfa561a8f765a3cb602b1bc9fd',
          locked: true,
        },
      ],
      outputs: [
        {
          datasetId: 'dataset-daily-metrics',
          version: 'v2025.03.02',
          uri: 's3://analytics/daily-metrics/v2025-03-02/',
          format: 'delta',
          sizeBytes: 13_244_982_272,
          checksum: 'd6c8b2c96561fcde1f5afcd1cdac8d0683b8b71d6be171ff1be2ac7f9bf53b72',
        },
      ],
      policies: [
        {
          id: 'policy-gdpr',
          name: 'GDPR data minimization',
          sha: 'policy-gdpr@2025.01',
          enforcedBy: 'opa-runtime@4.2.0',
        },
      ],
    },
  },
  {
    id: 'eltm-run-20250303-1200Z',
    jobName: 'daily_metrics_build',
    label: 'Daily metrics build — Mar 03',
    commitSha: 'f3aa0b5',
    capturedAt: '2025-03-03T12:00:00.000Z',
    triggeredBy: 'analytics-bot',
    metrics: {
      runDurationSeconds: 1812,
      outputRecords: 131_022,
      dataFreshnessHours: 3,
    },
    nodes: [
      {
        id: 'dataset-raw-events',
        type: 'dataset',
        name: 'raw_events',
        version: 'v2025.03.02',
        metadata: {
          format: 'parquet',
          rowCount: 5_420_000,
          location: 's3://analytics/raw-events/v2025-03-02/',
        },
      },
      {
        id: 'transform-normalize-events',
        type: 'transform',
        name: 'normalize_raw_events',
        version: 'etl@1.4.1',
        commitSha: 'd72b512',
        metadata: {
          image: 'analytics/etl-normalize:1.4.1',
          entrypoint: 'python pipelines/normalize.py',
        },
      },
      {
        id: 'dataset-clean-events',
        type: 'dataset',
        name: 'clean_events',
        version: 'v2025.03.02',
        metadata: {
          format: 'delta',
          rowCount: 5_350_000,
          location: 's3://analytics/clean-events/v2025-03-02/',
        },
        policies: ['policy-gdpr'],
      },
      {
        id: 'dataset-enriched-events',
        type: 'dataset',
        name: 'enriched_events',
        version: 'v2025.03.02',
        metadata: {
          format: 'delta',
          rowCount: 2_912_000,
          location: 's3://analytics/enriched-events/v2025-03-02/',
        },
      },
      {
        id: 'transform-enrich-events',
        type: 'transform',
        name: 'enrich_events',
        version: 'etl@0.9.1',
        commitSha: '5f77391',
        metadata: {
          image: 'analytics/enrich-events:0.9.1',
          entrypoint: 'python pipelines/enrich.py',
        },
      },
      {
        id: 'policy-gdpr',
        type: 'policy',
        name: 'GDPR data minimization',
        version: 'policy@2025.01',
        metadata: {
          owner: 'governance-team',
          enforcement: 'column-level-redaction',
        },
      },
      {
        id: 'policy-data-retention',
        type: 'policy',
        name: 'Data retention (90 days)',
        version: 'policy@2025.02',
        metadata: {
          owner: 'risk-office',
          enforcement: 'dataset-expiration-check',
        },
      },
      {
        id: 'transform-train-metrics',
        type: 'transform',
        name: 'train_daily_metrics',
        version: 'ml@3.2.1',
        commitSha: 'f56aa1b',
        metadata: {
          image: 'analytics/train-metrics:3.2.1',
          entrypoint: 'python jobs/train_metrics.py',
        },
      },
      {
        id: 'dataset-daily-metrics',
        type: 'output',
        name: 'daily_metrics',
        version: 'v2025.03.03',
        metadata: {
          format: 'delta',
          location: 's3://analytics/daily-metrics/v2025-03-03/',
        },
        policies: ['policy-data-retention'],
      },
    ],
    edges: [
      {
        id: 'edge-raw-to-normalize',
        source: 'dataset-raw-events',
        target: 'transform-normalize-events',
        relationship: 'consumes',
      },
      {
        id: 'edge-normalize-to-clean',
        source: 'transform-normalize-events',
        target: 'dataset-clean-events',
        relationship: 'produces',
      },
      {
        id: 'edge-clean-to-enrich',
        source: 'dataset-clean-events',
        target: 'transform-enrich-events',
        relationship: 'consumes',
      },
      {
        id: 'edge-enrich-to-enriched',
        source: 'transform-enrich-events',
        target: 'dataset-enriched-events',
        relationship: 'produces',
      },
      {
        id: 'edge-enriched-to-train',
        source: 'dataset-enriched-events',
        target: 'transform-train-metrics',
        relationship: 'consumes',
      },
      {
        id: 'edge-policy-gdpr',
        source: 'policy-gdpr',
        target: 'dataset-clean-events',
        relationship: 'governs',
      },
      {
        id: 'edge-policy-retention',
        source: 'policy-data-retention',
        target: 'dataset-daily-metrics',
        relationship: 'governs',
        description: 'New retention policy on published metrics',
      },
      {
        id: 'edge-train-to-output',
        source: 'transform-train-metrics',
        target: 'dataset-daily-metrics',
        relationship: 'produces',
      },
    ],
    replay: {
      orchestratorImage: 'intelgraph/orchestrator:2.7.2',
      entrypoint: 'pipelines/daily_metrics.py',
      environment: {
        PYTHONHASHSEED: '0',
        ML_PROFILE: 'daily_metrics',
        NUM_THREADS: '24',
        RETENTION_POLICY: '90',
      },
      parameters: [
        {
          key: 'window_days',
          value: '7',
          description: 'Rolling window length for aggregation',
          source: 'git',
          locked: true,
          checksum: 'c4e1fa28b9fb6f8a9bd79d34e4f8c8f5f46e5dd6c4a1b12c28dbf89bb6fc9d52',
        },
        {
          key: 'minimum_sessions',
          value: '18',
          description: 'Session threshold for inclusion',
          source: 'user',
          locked: true,
          checksum: 'a5d63d3b9d79190d6307e4e47606b5b20f0600087b4557e4ac66e0a2ffe3817d',
        },
        {
          key: 'feature_flag_enriched',
          value: 'true',
          description: 'Enable enrichment branch',
          source: 'runtime',
          locked: true,
          checksum: 'af0b88f0d9dfe0e2ea6a0207b9f1196c6f72b15fdcfd5a7dabcc9a1c7b0f4f6d',
        },
      ],
      inputs: [
        {
          datasetId: 'dataset-raw-events',
          version: 'v2025.03.02',
          uri: 's3://analytics/raw-events/v2025-03-02/',
          format: 'parquet',
          sizeBytes: 130_908_112_384,
          checksum: '7e2cf6a55226d4555ff13e98d10a5d1d4b69b8afc563c35f708bf3e0c301d2ad',
          locked: true,
        },
        {
          datasetId: 'dataset-clean-events',
          version: 'v2025.03.02',
          uri: 's3://analytics/clean-events/v2025-03-02/',
          format: 'delta',
          sizeBytes: 69_884_213_248,
          checksum: '15b0c2eaf2bf20f0f5c18f4de5d17a42d88d0f3c7f4a5412559d94c3a808182a',
          locked: true,
        },
        {
          datasetId: 'dataset-enriched-events',
          version: 'v2025.03.02',
          uri: 's3://analytics/enriched-events/v2025-03-02/',
          format: 'delta',
          sizeBytes: 25_192_884_224,
          checksum: 'f09f7d3acb80a6f1274cfbcd4452d4f2cbdd960913d9ef42b5f529cbf5f6be21',
          locked: true,
        },
      ],
      outputs: [
        {
          datasetId: 'dataset-daily-metrics',
          version: 'v2025.03.03',
          uri: 's3://analytics/daily-metrics/v2025-03-03/',
          format: 'delta',
          sizeBytes: 13_598_221_312,
          checksum: 'a6b3d8fc3e58a83c4feeb2bc8dbdfde0b0a4d0a0b44d18737b4a96f64fba88ef',
        },
      ],
      policies: [
        {
          id: 'policy-gdpr',
          name: 'GDPR data minimization',
          sha: 'policy-gdpr@2025.01',
          enforcedBy: 'opa-runtime@4.2.0',
        },
        {
          id: 'policy-data-retention',
          name: 'Data retention (90 days)',
          sha: 'policy-retention@2025.02',
          enforcedBy: 'opa-runtime@4.2.0',
        },
      ],
    },
  },
];

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, stableStringify(val)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, val]) => `${key}:${val}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const buildManifest = (seed: SnapshotSeed): ReplayManifest => {
  const manifest = {
    runId: seed.id,
    jobName: seed.jobName,
    commitSha: seed.commitSha,
    capturedAt: seed.capturedAt,
    orchestratorImage: seed.replay.orchestratorImage,
    entrypoint: seed.replay.entrypoint,
    environment: seed.replay.environment,
    inputs: seed.replay.inputs,
    parameters: seed.replay.parameters,
    outputs: seed.replay.outputs,
    policies: seed.replay.policies,
    artifactChecksum: '',
  } satisfies ReplayManifest;

  const checksumSource = stableStringify({
    runId: manifest.runId,
    commitSha: manifest.commitSha,
    environment: manifest.environment,
    inputs: manifest.inputs,
    parameters: manifest.parameters,
    outputs: manifest.outputs,
    policies: manifest.policies,
  });

  manifest.artifactChecksum = createHash('sha256').update(checksumSource).digest('hex');
  return manifest;
};

const snapshots: LineageSnapshot[] = seeds.map((seed) => ({
  ...seed,
  manifestChecksum: buildManifest(seed).artifactChecksum,
}));

export const manifestCache = new Map<string, ReplayManifest>();
for (const seed of seeds) {
  const manifest = buildManifest(seed);
  manifestCache.set(seed.id, manifest);
}

export const lineageSnapshots = snapshots;
