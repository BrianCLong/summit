import { readFile } from 'node:fs/promises';
import path from 'node:path';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schemaDir = path.resolve(process.cwd(), 'docs/api');

const loadSchema = async (filename) => {
  const raw = await readFile(path.join(schemaDir, filename), 'utf8');
  return JSON.parse(raw);
};

const ensureNoTimestamps = (schema, label) => {
  const properties = schema?.properties ?? {};
  const disallowed = ['createdAtIso', 'createdAt', 'updatedAt', 'timestamp'];
  const found = disallowed.filter((field) => field in properties);
  if (found.length > 0) {
    throw new Error(
      `${label} schema must not define timestamp fields: ${found.join(', ')}`,
    );
  }
};

const run = async () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  const reportSchema = await loadSchema('evidence.report.schema.json');
  const metricsSchema = await loadSchema('evidence.metrics.schema.json');
  const stampSchema = await loadSchema('evidence.stamp.schema.json');
  const indexSchema = await loadSchema('evidence.index.schema.json');

  ensureNoTimestamps(reportSchema, 'EvidenceReport');
  ensureNoTimestamps(metricsSchema, 'EvidenceMetrics');

  const reportSample = {
    evidenceId: 'EVD-DECAGON-CX-001',
    runId: 'run-001',
    agent: { name: 'concierge', version: '0.1.0' },
    inputSummary: 'Customer requested a refund.',
    decisions: [{ step: 'classify', rationale: 'Refund intent detected.' }],
    outputs: [{ kind: 'proposal', ref: 'proposal.json' }],
  };

  const metricsSample = {
    evidenceId: 'EVD-DECAGON-CX-001',
    runId: 'run-001',
    counters: { containment_rate: 0.0 },
  };

  const stampSample = {
    evidenceId: 'EVD-DECAGON-CX-001',
    runId: 'run-001',
    createdAtIso: '2026-02-06T00:00:00.000Z',
  };

  const indexSample = {
    'EVD-DECAGON-CX-001': {
      report: 'evidence/run-001/report.json',
      metrics: 'evidence/run-001/metrics.json',
      stamp: 'evidence/run-001/stamp.json',
    },
  };

  const validations = [
    { label: 'EvidenceReport', schema: reportSchema, sample: reportSample },
    { label: 'EvidenceMetrics', schema: metricsSchema, sample: metricsSample },
    { label: 'EvidenceStamp', schema: stampSchema, sample: stampSample },
    { label: 'EvidenceIndex', schema: indexSchema, sample: indexSample },
  ];

  const failures = [];

  for (const { label, schema, sample } of validations) {
    const validate = ajv.compile(schema);
    const ok = validate(sample);
    if (!ok) {
      failures.push({ label, errors: validate.errors });
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`Schema validation failed for ${failure.label}:`);
      console.error(JSON.stringify(failure.errors, null, 2));
    }
    process.exit(1);
  }

  console.log('Evidence schemas validated.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
