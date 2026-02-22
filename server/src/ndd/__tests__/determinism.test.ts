import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EvidenceWriter } from '../evidence/artifacts';
import { computeBaselineMetrics, NarrativeCluster } from '../metrics/baseline';
import { stableHash } from '../utils/normalization';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_PATH = path.join(__dirname, 'fixtures/fixtureA_seeded.json');
const TEST_OUTPUT_DIR = path.join(__dirname, 'output_test');

describe('NDD Determinism & Evidence Contract', () => {
  let clusters: NarrativeCluster[];

  beforeAll(async () => {
    const data = await fs.readFile(FIXTURE_PATH, 'utf-8');
    clusters = JSON.parse(data);
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('should produce identical metrics.json for same inputs', async () => {
    const config = {
      datasetId: 'fixtureA',
      pipelineVersion: 'v0.1.0',
      runId: 'test-run-001',
      outputDir: TEST_OUTPUT_DIR
    };

    const writer = new EvidenceWriter(config);

    // Simulate pipeline processing
    // We use a FIXED timestamp for the vectors to ensure determinism of the CONTENT.
    const FIXED_TIMESTAMP = '2025-01-01T12:00:00Z';

    const metrics = clusters.map(c => computeBaselineMetrics(c, FIXED_TIMESTAMP));

    const filePath = await writer.writeArtifact('metrics', metrics);
    const content = await fs.readFile(filePath, 'utf-8');

    // Check determinism by hashing the output file content
    const fileHash = stableHash(content);

    // Run 2: Same input, same timestamp
    const writer2 = new EvidenceWriter(config);
    const metrics2 = clusters.map(c => computeBaselineMetrics(c, FIXED_TIMESTAMP));
    const filePath2 = await writer2.writeArtifact('metrics_run2', metrics2);
    const content2 = await fs.readFile(filePath2, 'utf-8');

    expect(content).toBe(content2);

    // Verify specific values
    const data = JSON.parse(content);
    expect(data).toHaveLength(2);
    // Cluster 1: 2 unique origins / (0.5 + 0.001) = 2 / 0.501 ~= 3.9920
    expect(data.find((d: any) => d.clusterId === 'cluster_001').originDensityScore).toBeCloseTo(3.9920, 3);
  });

  it('should generate valid stamp.json', async () => {
    const config = {
      datasetId: 'fixtureA',
      pipelineVersion: 'v0.1.0',
      runId: 'test-run-001',
      outputDir: TEST_OUTPUT_DIR
    };
    const writer = new EvidenceWriter(config);

    const stamp = {
      code_sha: 'abc1234',
      data_sha: 'def5678',
      model_sha: 'ghi9012',
      seed: 12345,
      pipeline_version: 'v0.1.0',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      determinism_ok: true
    };

    const filePath = await writer.writeStamp(stamp);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.determinism_ok).toBe(true);
    expect(data.code_sha).toBe('abc1234');
  });

  it('should generate human-readable report.json', async () => {
    const config = {
      datasetId: 'fixtureA',
      pipelineVersion: 'v0.1.0',
      runId: 'test-run-001',
      outputDir: TEST_OUTPUT_DIR
    };
    const writer = new EvidenceWriter(config);

    const report = {
      summary: "NDD Analysis Report",
      alerts: [],
      metrics: {
        totalClusters: 2
      }
    };

    const filePath = await writer.writeReport(report);
    const content = await fs.readFile(filePath, 'utf-8');

    // Should be valid JSON
    const data = JSON.parse(content);
    expect(data.summary).toBe("NDD Analysis Report");

    // Should have new lines (pretty printed)
    expect(content).toContain('\n');
    expect(content).toContain('  "summary": "NDD Analysis Report"');
  });
});
