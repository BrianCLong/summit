import * as fs from 'fs';
import * as path from 'path';
import { EvidenceWriter } from '../EvidenceWriter.js';
import { DeliberationResult } from '../../deliberation/DeliberationEngine.js';

describe('EvidenceWriter', () => {
  const outputDir = 'test-evidence-output';

  afterEach(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  test('should write deterministic artifacts', () => {
    const writer = new EvidenceWriter({
      outputDir,
      runId: 'test-run',
      gitShortSha: 'abc1234'
    });

    const mockResult: DeliberationResult = {
      selectedExplanation: { id: 'c1', seedEntities: [], discoverySubgraphRef: 'r', rationale: '' },
      selectedProof: { nodes: [], edges: [] },
      robustness: { score: 0.8, pathMultiplicity: 1, evidenceDiversity: 1, stability: 1, minimality: 1 },
      rejectedExplanations: []
    };

    const evid = writer.writeArtifacts(mockResult, { latency: 100 });

    const evidDir = path.join(outputDir, evid);
    expect(fs.existsSync(path.join(evidDir, 'report.json'))).toBe(true);
    expect(fs.existsSync(path.join(evidDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(evidDir, 'stamp.json'))).toBe(true);

    const report = JSON.parse(fs.readFileSync(path.join(evidDir, 'report.json'), 'utf8'));
    expect(report.run_id).toBe('test-run');
  });
});
