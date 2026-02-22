import { readFile } from 'node:fs/promises';
import path from 'node:path';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schemaDir = path.resolve(process.cwd(), 'docs/api');

const loadSchema = async (filename: string) => {
  const raw = await readFile(path.join(schemaDir, filename), 'utf8');
  return JSON.parse(raw);
};

describe('Evidence schemas', () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  it('validates report, metrics, stamp, and index samples', async () => {
    const reportSchema = await loadSchema('evidence.report.schema.json');
    const metricsSchema = await loadSchema('evidence.metrics.schema.json');
    const stampSchema = await loadSchema('evidence.stamp.schema.json');
    const indexSchema = await loadSchema('evidence.index.schema.json');

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

    const reportValidate = ajv.compile(reportSchema);
    const metricsValidate = ajv.compile(metricsSchema);
    const stampValidate = ajv.compile(stampSchema);
    const indexValidate = ajv.compile(indexSchema);

    expect(reportValidate(reportSample)).toBe(true);
    expect(metricsValidate(metricsSample)).toBe(true);
    expect(stampValidate(stampSample)).toBe(true);
    expect(indexValidate(indexSample)).toBe(true);
  });
});
