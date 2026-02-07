import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { writeEvidenceBundle } from '../../../src/graphrag/evidence/writeEvidence';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schemaDir = path.join(
  process.cwd(),
  'src',
  'graphrag',
  'evidence',
  'schemas',
);

function loadSchema(name: string) {
  const schemaPath = path.join(schemaDir, name);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

describe('Graphrag evidence writer', () => {
  const baseReport = {
    run_id: 'SITREP-2026-02-06',
    generated_by: 'graphrag-evidence-test',
    summary: 'Deterministic evidence report for IO watchboard.',
    items: [
      {
        evidence_id: 'EVD-IO-SITREP20260206-INGEST-001',
        area: 'INGEST',
        title: 'Ingested SITREP payload',
        files: ['evidence/SITREP-2026-02-06/report.json'],
      },
    ],
  };

  const baseMetrics = {
    run_id: 'SITREP-2026-02-06',
    counts: {
      items_ingested: 1,
      campaigns: 1,
      narratives: 1,
      claims: 1,
      artifacts: 0,
      sources_count: 2,
      unique_domains: 2,
      synthetic_risk_high_count: 0,
      cluster_count: 0,
    },
  };

  const baseStamp = {
    run_id: 'SITREP-2026-02-06',
    generated_at_utc: '2026-02-06T00:00:00Z',
  };

  test('writes deterministic bundle and root index', () => {
    const previousCwd = process.cwd();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-test-'));
    const runDir = path.join(tempRoot, 'evidence', 'SITREP-2026-02-06');

    process.chdir(tempRoot);
    const result = writeEvidenceBundle({
      outDir: runDir,
      runId: 'SITREP-2026-02-06',
      report: baseReport,
      metrics: baseMetrics,
      stamp: baseStamp,
      index: [
        {
          evidence_id: 'EVD-IO-SITREP20260206-INGEST-001',
          files: [
            'evidence/SITREP-2026-02-06/report.json',
            'evidence/SITREP-2026-02-06/metrics.json',
            'evidence/SITREP-2026-02-06/stamp.json',
          ],
        },
      ],
    });

    const reportContent = fs.readFileSync(path.join(runDir, 'report.json'), 'utf8');
    const metricsContent = fs.readFileSync(path.join(runDir, 'metrics.json'), 'utf8');
    const indexContent = fs.readFileSync(
      path.join(tempRoot, 'evidence', 'index.json'),
      'utf8',
    );

    const secondResult = writeEvidenceBundle({
      outDir: runDir,
      runId: 'SITREP-2026-02-06',
      report: baseReport,
      metrics: baseMetrics,
      stamp: baseStamp,
      index: [
        {
          evidence_id: 'EVD-IO-SITREP20260206-INGEST-001',
          files: [
            'evidence/SITREP-2026-02-06/report.json',
            'evidence/SITREP-2026-02-06/metrics.json',
            'evidence/SITREP-2026-02-06/stamp.json',
          ],
        },
      ],
    });

    expect(result.written).toBe(true);
    expect(secondResult.written).toBe(true);
    expect(reportContent).toBe(
      fs.readFileSync(path.join(runDir, 'report.json'), 'utf8'),
    );
    expect(metricsContent).toBe(
      fs.readFileSync(path.join(runDir, 'metrics.json'), 'utf8'),
    );
    expect(indexContent).toBe(
      fs.readFileSync(path.join(tempRoot, 'evidence', 'index.json'), 'utf8'),
    );

    process.chdir(previousCwd);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('respects kill switch', () => {
    const previousCwd = process.cwd();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-test-'));
    const runDir = path.join(tempRoot, 'evidence', 'SITREP-2026-02-06');
    const previousEnv = process.env.EVIDENCE_WRITE;

    process.env.EVIDENCE_WRITE = '0';
    process.chdir(tempRoot);

    const result = writeEvidenceBundle({
      outDir: runDir,
      runId: 'SITREP-2026-02-06',
      report: baseReport,
      metrics: baseMetrics,
      stamp: baseStamp,
      index: [],
    });

    expect(result.written).toBe(false);
    expect(fs.existsSync(runDir)).toBe(false);

    process.env.EVIDENCE_WRITE = previousEnv;
    process.chdir(previousCwd);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('schemas validate expected payloads', () => {
    const reportSchema = loadSchema('report.schema.json');
    const metricsSchema = loadSchema('metrics.schema.json');
    const stampSchema = loadSchema('stamp.schema.json');

    const validateReport = ajv.compile(reportSchema);
    const validateMetrics = ajv.compile(metricsSchema);
    const validateStamp = ajv.compile(stampSchema);

    expect(validateReport(baseReport)).toBe(true);
    expect(validateMetrics(baseMetrics)).toBe(true);
    expect(validateStamp(baseStamp)).toBe(true);

    const invalidReport = { ...baseReport } as Record<string, unknown>;
    delete invalidReport.items;
    expect(validateReport(invalidReport)).toBe(false);
  });
});
