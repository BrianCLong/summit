import { describe, expect, it } from 'vitest';
import { diffWorkflowSnapshots } from '../src/index';
import type { WorkflowSnapshot } from 'common-types';

const baselineSnapshot: WorkflowSnapshot = {
  snapshotId: 'wf@1',
  branch: 'main',
  recordedAt: '2024-01-01T00:00:00Z',
  definition: {
    workflowId: 'wf-data-pipeline',
    name: 'Data ingest baseline',
    version: 1,
    tenantId: 'mc',
    policy: {
      purpose: 'ingest baseline',
      retention: 'standard-365d',
      licenseClass: 'internal',
      pii: false,
    },
    constraints: {
      latencyP95Ms: 2000,
      budgetUSD: 100,
    },
    nodes: [
      {
        id: 'extract',
        type: 'data.ingest.http',
        name: 'Extract',
        params: { endpoint: 'https://api.mc.example/v1/export' },
        policy: { handlesPii: false },
        produces: [{ name: 'raw', type: 'generic' }],
      },
      {
        id: 'transform',
        type: 'compute.transform',
        name: 'Transform',
        params: { script: 'normalize' },
        consumes: [{ name: 'raw', type: 'generic' }],
        produces: [{ name: 'normalized', type: 'generic' }],
      },
    ],
    edges: [{ from: 'extract', to: 'transform', on: 'success' }],
  },
  dependencies: [
    {
      id: 'analytics-db',
      name: 'Analytics Warehouse',
      type: 'database',
      version: '1.2.0',
      domain: 'data',
      criticality: 'high',
      attachedNodes: ['transform'],
    },
  ],
  policyBindings: [
    {
      controlId: 'privacy-guard',
      domain: 'privacy',
      coverage: 'full',
      impactedNodes: ['extract'],
    },
  ],
  runtime: {
    stats: {
      latencyMs: 900,
      costUSD: 40,
      criticalPath: ['extract', 'transform'],
      retries: 0,
    },
    resourceProfiles: [
      { nodeId: 'extract', latencyMs: 450, costUSD: 15 },
      { nodeId: 'transform', latencyMs: 450, costUSD: 25 },
    ],
    incidents: [],
  },
};

const targetSnapshot: WorkflowSnapshot = {
  snapshotId: 'wf@2',
  branch: 'feature/privacy-upgrade',
  recordedAt: '2024-02-01T00:00:00Z',
  definition: {
    workflowId: 'wf-data-pipeline',
    name: 'Data ingest with anonymization',
    version: 2,
    tenantId: 'mc',
    policy: {
      purpose: 'ingest with anonymization',
      retention: 'standard-365d',
      licenseClass: 'internal',
      pii: true,
    },
    constraints: {
      latencyP95Ms: 2200,
      budgetUSD: 120,
    },
    nodes: [
      {
        id: 'extract',
        type: 'data.ingest.http',
        name: 'Extract',
        params: { endpoint: 'https://api.mc.example/v2/export' },
        policy: { handlesPii: true },
        produces: [{ name: 'raw', type: 'generic' }],
      },
      {
        id: 'anonymize',
        type: 'data.masking',
        name: 'Anonymize',
        params: { strategy: 'tokenize' },
        consumes: [{ name: 'raw', type: 'generic' }],
        produces: [{ name: 'masked', type: 'generic' }],
        policy: { handlesPii: true },
        estimates: { costUSD: 10, latencyP95Ms: 350 },
      },
      {
        id: 'transform',
        type: 'compute.transform',
        name: 'Transform',
        params: { script: 'normalize-v2' },
        consumes: [{ name: 'masked', type: 'generic' }],
        produces: [{ name: 'normalized', type: 'generic' }],
      },
    ],
    edges: [
      { from: 'extract', to: 'anonymize', on: 'success' },
      { from: 'anonymize', to: 'transform', on: 'success' },
    ],
  },
  dependencies: [
    {
      id: 'analytics-db',
      name: 'Analytics Warehouse',
      type: 'database',
      version: '2.0.0',
      domain: 'data',
      criticality: 'mission-critical',
      attachedNodes: ['transform'],
    },
    {
      id: 'privacy-service',
      name: 'Privacy Service',
      type: 'service',
      version: '5.1.0',
      domain: 'privacy',
      criticality: 'high',
      attachedNodes: ['anonymize'],
    },
  ],
  policyBindings: [
    {
      controlId: 'privacy-guard',
      domain: 'privacy',
      coverage: 'partial',
      impactedNodes: ['extract', 'anonymize'],
    },
    {
      controlId: 'reg-ops',
      domain: 'regulatory',
      coverage: 'none',
      impactedNodes: ['transform'],
    },
  ],
  runtime: {
    stats: {
      latencyMs: 1500,
      costUSD: 65,
      criticalPath: ['extract', 'anonymize', 'transform'],
      retries: 2,
    },
    resourceProfiles: [
      { nodeId: 'extract', latencyMs: 500, costUSD: 20 },
      { nodeId: 'anonymize', latencyMs: 600, costUSD: 15 },
      { nodeId: 'transform', latencyMs: 400, costUSD: 30 },
    ],
    incidents: [
      {
        id: 'incident-1',
        severity: 'high',
        summary: 'Data surge triggered throttling',
        nodes: ['anonymize'],
      },
    ],
  },
};

describe('workflow diff engine', () => {
  it('detects layered graph deltas and produces migration plan', () => {
    const result = diffWorkflowSnapshots(baselineSnapshot, targetSnapshot);

    expect(result.graphDelta.baselineFingerprint).not.toEqual(
      result.graphDelta.targetFingerprint,
    );
    expect(
      result.functionalChanges.some((change) => change.severity === 'critical'),
    ).toBe(true);
    expect(result.dependencyChanges.length).toBeGreaterThan(0);
    expect(
      result.dependencyChanges.some((change) => change.domain === 'data'),
    ).toBe(true);
    expect(
      result.policyChanges.some((change) => change.domain === 'regulatory'),
    ).toBe(true);
    expect(
      result.runtimeChanges.some((change) =>
        change.impactedNodes.includes('anonymize'),
      ),
    ).toBe(true);

    expect(
      result.riskAnnotations.some(
        (annotation) => annotation.domain === 'privacy',
      ),
    ).toBe(true);
    expect(result.migrationPlan.steps.length).toBeGreaterThan(0);
    expect(result.migrationPlan.tests.map((test) => test.name)).toContain(
      'policy-regression',
    );
    expect(result.continuousChecks.map((check) => check.name)).toContain(
      'gapless-merge-simulator',
    );
  });
});
