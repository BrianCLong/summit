import assert from 'node:assert/strict';

import {
  DEFAULT_RETENTION,
  DEFAULT_VALIDATION_DEFAULTS,
  analyzeEvidence,
  createWhatIfScenario,
  emptyWorkflow,
  ensureSecret,
  enumerateArtifacts,
  listSinkNodes,
  listSourceNodes,
  normalizeWorkflow,
  summarizeWorkflow,
  type WorkflowDefinition,
  type WorkflowNode,
} from '../src/index.ts';

type TestFn = () => void;

function runTest(name: string, fn: TestFn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✖ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

runTest('emptyWorkflow applies platform defaults', () => {
  const wf = emptyWorkflow('tenant-1', 'demo', 'owner');
  assert.equal(wf.policy.retention, DEFAULT_RETENTION);
  assert.equal(wf.constraints.maxParallelism, 32);
  assert.equal(wf.defaults?.retries, DEFAULT_VALIDATION_DEFAULTS.retries);
  assert.equal(wf.nodes.length, 0);
  assert.ok(wf.createdAt);
});

runTest('normalizeWorkflow injects evidence when missing', () => {
  const workflow: WorkflowDefinition = {
    workflowId: 'wf_1',
    tenantId: 'tenant-1',
    name: 'sample',
    version: 1,
    policy: {
      purpose: 'engineering',
      retention: DEFAULT_RETENTION,
      licenseClass: 'MIT-OK',
      pii: false,
    },
    constraints: {
      latencyP95Ms: 1000,
      budgetUSD: 10,
    },
    nodes: [
      {
        id: 'n1',
        type: 'git.clone',
        params: {},
      },
    ],
    edges: [],
  };

  const normalized = normalizeWorkflow(workflow);
  const node = normalized.nodes[0];
  assert.equal(node.retries, DEFAULT_VALIDATION_DEFAULTS.retries);
  assert.equal(node.timeoutMs, DEFAULT_VALIDATION_DEFAULTS.timeoutMs);
  assert.ok(node.evidenceOutputs?.length);
  assert.match(node.evidenceOutputs?.[0]?.path ?? '', /prov\/n1.json/);
});

runTest('graph helpers expose sources, sinks, and summaries', () => {
  const nodes: WorkflowNode[] = [
    { id: 'a', type: 'git.clone', params: {} },
    { id: 'b', type: 'test.junit', params: {} },
    { id: 'c', type: 'quality.coverage', params: {} },
  ];
  const wf = normalizeWorkflow({
    workflowId: 'wf_2',
    tenantId: 'tenant-1',
    name: 'graph',
    version: 1,
    policy: {
      purpose: 'engineering',
      retention: DEFAULT_RETENTION,
      licenseClass: 'MIT-OK',
      pii: false,
    },
    constraints: { latencyP95Ms: 1000, budgetUSD: 10 },
    nodes,
    edges: [
      { from: 'a', to: 'b', on: 'success' },
      { from: 'b', to: 'c', on: 'success' },
    ],
  });

  assert.deepEqual(listSourceNodes(wf), ['a']);
  assert.deepEqual(listSinkNodes(wf), ['c']);
  const summary = summarizeWorkflow(wf);
  assert.equal(summary.nodeCount, 3);
  assert.equal(summary.edgeCount, 2);
});

runTest('evidence analyzer differentiates required and optional', () => {
  const nodes: WorkflowNode[] = [
    {
      id: 'alpha',
      type: 'git.clone',
      params: {},
      evidenceOutputs: [],
    },
    {
      id: 'beta',
      type: 'test.junit',
      params: {},
      evidenceOutputs: [
        { type: 'junit', path: 'reports/junit.xml', required: true },
      ],
    },
    {
      id: 'gamma',
      type: 'quality.lint',
      params: {},
      evidenceOutputs: [
        { type: 'coverage', path: 'coverage/lcov.info', required: false },
      ],
    },
  ];

  const analysis = analyzeEvidence(nodes);
  assert.deepEqual(analysis.missing, ['alpha']);
  assert.deepEqual(analysis.complete, ['beta']);
  assert.deepEqual(analysis.optional, ['gamma']);
});

runTest('enumerateArtifacts aggregates produced bindings', () => {
  const nodes: WorkflowNode[] = [
    {
      id: 'alpha',
      type: 'test.junit',
      params: {},
      produces: [
        { name: 'junit', type: 'junit' },
        { name: 'coverage', type: 'coverage', optional: true },
      ],
    },
  ];
  const artifacts = enumerateArtifacts(nodes);
  assert.equal(artifacts.length, 2);
  assert.equal(artifacts[0]?.type, 'junit');
});

runTest('ensureSecret only accepts vault references', () => {
  assert.equal(ensureSecret('plain'), false);
  assert.equal(
    ensureSecret({ vault: 'vault://main', key: 'db/password' }),
    true,
  );
});

runTest('createWhatIfScenario wraps overrides', () => {
  const scenario = createWhatIfScenario('low parallelism', {
    nodeA: { latencyP95Ms: 1000 },
  });
  assert.equal(scenario.label, 'low parallelism');
  assert.equal(scenario.overrides?.nodeA?.latencyP95Ms, 1000);
});

if (!process.exitCode) {
  console.log('All common-types assertions passed.');
}
