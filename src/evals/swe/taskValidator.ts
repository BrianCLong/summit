import * as fs from 'fs';
import * as path from 'path';

/**
 * TaskValidator
 *
 * Validates tasks from datasets before processing to ensure agents train on meaningful
 * and reproducible signals rather than noisy/broken data.
 */
export class TaskValidator {
  /**
   * Check if the repository builds successfully with the given setup.
   * @param repoPath Path to the repository.
   * @returns Boolean indicating successful build.
   */
  async repoBuildsSuccessfully(repoPath: string): Promise<boolean> {
    // Stub validation rule
    console.log(`Verifying build success for ${repoPath}`);
    return true;
  }

  /**
   * Check if the failing tests specified in the task are actually reproducible.
   * @param repoPath Path to the repository.
   * @param testPaths Paths to the failing tests.
   * @returns Boolean indicating reproducibility.
   */
  async failingTestsReproducible(repoPath: string, testPaths: string[]): Promise<boolean> {
    // Stub validation rule
    console.log(`Verifying reproducible failing tests for ${repoPath}`);
    return true;
  }

  /**
   * Check if the provided ground truth patch actually passes the previously failing tests.
   * @param repoPath Path to the repository.
   * @param patchContent Content of the ground truth patch.
   * @returns Boolean indicating ground truth tests pass.
   */
  async groundTruthPatchPassesTests(repoPath: string, patchContent: string): Promise<boolean> {
    // Stub validation rule
    console.log(`Verifying ground truth patch passes tests for ${repoPath}`);
    return true;
  }

  /**
   * Check if the patch modifies a minimal set of files instead of being overly broad.
   * @param patchContent Content of the ground truth patch.
   * @returns Boolean indicating minimal files were modified.
   */
  async minimalFilesModified(patchContent: string): Promise<boolean> {
    // Stub validation rule
    console.log(`Verifying minimal files are modified`);
    return true;
  }

  /**
   * Validates the task overall by applying the rules and emitting results.
   * @param taskId Unique identifier for the task.
   * @param validationResult Result object to be emitted.
   */
  emitValidatedTask(taskId: string, validationResult: {
    valid: boolean;
    fail_tests: number;
    pass_after_patch: boolean;
  }): void {
    const resultsDir = path.join(process.cwd(), 'datasets/swe');

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const outputPath = path.join(resultsDir, 'validated_tasks.json');

    let existingData: Record<string, any> = {};
    if (fs.existsSync(outputPath)) {
      try {
        const fileContent = fs.readFileSync(outputPath, 'utf-8');
        existingData = JSON.parse(fileContent);
      } catch (err) {
        console.warn('Could not parse existing validated_tasks.json, overwriting.');
      }
    }

    existingData[taskId] = {
      task_id: taskId,
      ...validationResult
    };

    fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf-8');
    console.log(`Emitted validated task ${taskId} to ${outputPath}`);
  }
}
