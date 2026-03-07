import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface TaskValidationInput {
  taskId: string;
  repoBuildsSuccessfully: boolean;
  failingTestsReproducible: boolean;
  groundTruthPatchPassesTests: boolean;
  minimalFilesModified: boolean;
  failTests: number;
}

export interface TaskValidationResult {
  task_id: string;
  valid: boolean;
  fail_tests: number;
  pass_after_patch: boolean;
  checks: {
    repo_builds_successfully: boolean;
    failing_tests_reproducible: boolean;
    ground_truth_patch_passes_tests: boolean;
    minimal_files_modified: boolean;
  };
}

export class TaskValidator {
  validateTask(input: TaskValidationInput): TaskValidationResult {
    const valid =
      input.repoBuildsSuccessfully &&
      input.failingTestsReproducible &&
      input.groundTruthPatchPassesTests &&
      input.minimalFilesModified;

    return {
      task_id: input.taskId,
      valid,
      fail_tests: input.failTests,
      pass_after_patch: input.groundTruthPatchPassesTests,
      checks: {
        repo_builds_successfully: input.repoBuildsSuccessfully,
        failing_tests_reproducible: input.failingTestsReproducible,
        ground_truth_patch_passes_tests: input.groundTruthPatchPassesTests,
        minimal_files_modified: input.minimalFilesModified,
      },
    };
  }

  emitValidatedTask(result: TaskValidationResult): void {
    const resultsDir = path.join(process.cwd(), 'datasets/swe-rebench');
    mkdirSync(resultsDir, { recursive: true });

    const outputPath = path.join(resultsDir, 'validated_tasks.json');
    const existingData = this.readValidatedTasks(outputPath);
    existingData[result.task_id] = result;

    writeFileSync(outputPath, `${JSON.stringify(existingData, null, 2)}\n`, 'utf-8');
  }

  private readValidatedTasks(outputPath: string): Record<string, TaskValidationResult> {
    try {
      return JSON.parse(readFileSync(outputPath, 'utf-8')) as Record<string, TaskValidationResult>;
    } catch {
      return {};
    }
  }
}
