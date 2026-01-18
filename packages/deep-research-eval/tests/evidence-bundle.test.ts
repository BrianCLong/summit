import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeEvidenceBundle } from '../src/evidence/bundle.js';
import type { AdaptiveRubric, ScoringResult } from '../src/rubric/types.js';
import type { TaskDefinition } from '../src/taskpack/schema.js';

const task: TaskDefinition = {
  id: 'task-101',
  topic: 'Evidence bundle test',
  language: 'en',
  prompt: 'Analyze evidence with citations and summarize findings.',
};

const rubric: AdaptiveRubric = {
  taskId: task.id,
  generatedAt: '2026-01-15T00:00:00Z',
  seed: 'seed',
  dimensions: [],
  sourceTask: task,
};

const scoring: ScoringResult = {
  taskId: task.id,
  totalScore: 5,
  maxScore: 10,
  dimensionScores: [],
};

describe('evidence bundle', () => {
  it('writes manifest and bundle payloads', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'deep-research-eval-'));

    try {
      const output = await writeEvidenceBundle(baseDir, {
        runId: 'run-test',
        task,
        reportId: 'report-test',
        reportText: 'Sample report text.',
        rubric,
        scoring,
        factChecks: [],
        factSummary: {
          totalClaims: 0,
          checkedClaims: 0,
          coverageRatio: 0,
          contradictions: 0,
        },
        policyViolations: [],
        claimGraph: { nodes: [], edges: [] },
      });

      const manifest = JSON.parse(await readFile(output.manifestPath, 'utf-8'));
      expect(manifest.files['bundle.json']).toBeDefined();
      expect(manifest.files['report.html']).toBeDefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});
