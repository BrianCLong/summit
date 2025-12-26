import { EvidenceRecorder, EvidenceRecord } from './evidence';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('EvidenceRecorder', () => {
  let tempDir: string;
  let recorder: EvidenceRecorder;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-test-'));
    recorder = new EvidenceRecorder(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates evidence directory if it does not exist', () => {
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it('records metric to a file', () => {
    const expId = 'research-test-001';
    recorder.record(expId, 'latency', 100);

    const files = fs.readdirSync(tempDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain(expId);

    const content = JSON.parse(fs.readFileSync(path.join(tempDir, files[0]), 'utf-8'));
    expect(content.experimentId).toBe(expId);
    expect(content.metric).toBe('latency');
    expect(content.value).toBe(100);
  });

  it('retrieves evidence for an experiment', () => {
    const expId = 'research-test-002';
    recorder.record(expId, 'accuracy', 0.95);
    recorder.record(expId, 'accuracy', 0.96);

    // Another experiment
    recorder.record('research-other', 'accuracy', 0.5);

    const evidence = recorder.getEvidence(expId);
    expect(evidence).toHaveLength(2);
    expect(evidence.every(e => e.experimentId === expId)).toBe(true);
  });
});
