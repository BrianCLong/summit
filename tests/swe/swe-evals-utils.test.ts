import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { computeBehaviorReward } from '../../src/evals/swe/behaviorReward';
import { TaskValidator } from '../../src/evals/swe/taskValidator';

describe('SWE evaluation utility modules', () => {
  it('computes behavior reward using fail/pass and regressions', () => {
    const reward = computeBehaviorReward(0, 3, 1, 0.5);
    expect(reward).toBe(1.5);
  });

  it('validates tasks and persists result records', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'swe-validator-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);

      const validator = new TaskValidator();
      const result = validator.validateTask({
        taskId: 'repo__task-1',
        repoBuildsSuccessfully: true,
        failingTestsReproducible: true,
        groundTruthPatchPassesTests: true,
        minimalFilesModified: false,
        failTests: 3,
      });

      expect(result.valid).toBe(false);
      validator.emitValidatedTask(result);

      const outputPath = path.join(tempDir, 'datasets/swe-rebench/validated_tasks.json');
      const persisted = JSON.parse(readFileSync(outputPath, 'utf8')) as Record<string, { valid: boolean }>;
      expect(persisted['repo__task-1'].valid).toBe(false);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
