import fs from 'fs';
import path from 'path';
import { verifyEvidenceDir } from '../evidence/verifier/verify_evidence';

describe("Evidence Verifier Integration", () => {
  const testDir = 'evidence/runs/test-run-123';

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test("should pass for valid evidence", () => {
    const report = {
      run_id: 'test',
      mode: 'swarm',
      summary: 'ok',
      evidence_ids: ['EVD-TEST-001']
    };
    const metrics = {
      run_id: 'test',
      metrics: {
        agentsSpawned: 1,
        stepsExecuted: 1,
        toolCalls: 1,
        wallMs: 100
      }
    };
    const stamp = {
      run_id: 'test',
      generated_at: '2025-01-01T00:00:00Z'
    };

    fs.writeFileSync(path.join(testDir, 'report.json'), JSON.stringify(report));
    fs.writeFileSync(path.join(testDir, 'metrics.json'), JSON.stringify(metrics));
    fs.writeFileSync(path.join(testDir, 'stamp.json'), JSON.stringify(stamp));

    const result = verifyEvidenceDir(testDir);
    expect(result.ok).toBe(true);
  });

  test("should fail if timestamp is in report", () => {
    const report = {
      run_id: 'test',
      mode: 'swarm',
      summary: 'ok',
      evidence_ids: ['EVD-TEST-001'],
      time: '2025-01-01T00:00:00Z'
    };
    fs.writeFileSync(path.join(testDir, 'report.json'), JSON.stringify(report));
    const result = verifyEvidenceDir(testDir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Timestamp-like field found in report.json. Timestamps are only allowed in stamp.json.");
  });

  test("should fail if file is missing", () => {
    fs.unlinkSync(path.join(testDir, 'metrics.json'));
    const result = verifyEvidenceDir(testDir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Missing required file: metrics.json");
  });
});
