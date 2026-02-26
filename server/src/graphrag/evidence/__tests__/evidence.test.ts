import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EvidenceWriter } from '../writer';
import { EvidenceIndex } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('EvidenceWriter', () => {
  const testDir = path.join(__dirname, 'test-output');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create the base directory', () => {
    new EvidenceWriter(testDir);
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('should write evidence files correctly', () => {
    const writer = new EvidenceWriter(testDir);
    const evidenceId = 'EVD-test-MODEL-001';

    writer.writeEvidence(
      evidenceId,
      'PUBLIC',
      'Test Summary',
      { accuracy: 0.99 },
      ['Note 1']
    );

    const evidencePath = path.join(testDir, evidenceId);
    expect(fs.existsSync(evidencePath)).toBe(true);
    expect(fs.existsSync(path.join(evidencePath, 'report.json'))).toBe(true);
    expect(fs.existsSync(path.join(evidencePath, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(evidencePath, 'stamp.json'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'index.json'))).toBe(true);

    const report = JSON.parse(fs.readFileSync(path.join(evidencePath, 'report.json'), 'utf-8'));
    expect(report.evidence_id).toBe(evidenceId);
    expect(report.summary).toBe('Test Summary');

    const stamp = JSON.parse(fs.readFileSync(path.join(evidencePath, 'stamp.json'), 'utf-8'));
    expect(stamp.generated_at).toBeDefined();

    const metrics = JSON.parse(fs.readFileSync(path.join(evidencePath, 'metrics.json'), 'utf-8'));
    expect(metrics.metrics.accuracy).toBe(0.99);
  });

  it('should be deterministic (except stamp)', () => {
    const writer = new EvidenceWriter(testDir);
    const evidenceId = 'EVD-test-DETERM-001';

    writer.writeEvidence(evidenceId, 'INTERNAL', 'Summary', { val: 1 });

    const report1 = fs.readFileSync(path.join(testDir, evidenceId, 'report.json'), 'utf-8');
    const metrics1 = fs.readFileSync(path.join(testDir, evidenceId, 'metrics.json'), 'utf-8');

    // Rewrite same data
    writer.writeEvidence(evidenceId, 'INTERNAL', 'Summary', { val: 1 });

    const report2 = fs.readFileSync(path.join(testDir, evidenceId, 'report.json'), 'utf-8');
    const metrics2 = fs.readFileSync(path.join(testDir, evidenceId, 'metrics.json'), 'utf-8');

    expect(report1).toBe(report2);
    expect(metrics1).toBe(metrics2);
  });

  it('should update index correctly and sort by ID', () => {
    const writer = new EvidenceWriter(testDir);
    writer.writeEvidence('EVD-B', 'PUBLIC', 'B', {});
    writer.writeEvidence('EVD-A', 'PUBLIC', 'A', {});

    const indexContent = fs.readFileSync(path.join(testDir, 'index.json'), 'utf-8');
    const index: EvidenceIndex = JSON.parse(indexContent);

    expect(index.items).toHaveLength(2);
    expect(index.items[0].evidence_id).toBe('EVD-A');
    expect(index.items[1].evidence_id).toBe('EVD-B');
  });
});
