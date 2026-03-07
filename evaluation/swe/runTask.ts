import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SweRebenchInstance } from '../../datasets/swe-rebench/types';

export interface TestExecutionResult {
  passed: number;
  failed: number;
  failToPassPassed: number;
  regressions: number;
}

export interface TaskExecutionArtifacts {
  report: Record<string, unknown>;
  metrics: Record<string, unknown>;
  stamp: Record<string, unknown>;
}

export interface RunTaskDependencies {
  executeBefore(instance: SweRebenchInstance): Promise<TestExecutionResult>;
  executeAfter(instance: SweRebenchInstance): Promise<TestExecutionResult>;
  now?: () => number;
  outputRoot?: string;
}

function stableStringify(value: Record<string, unknown>): string {
  const ordered = Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});

  return JSON.stringify(ordered, null, 2);
}

export async function runTask(
  instance: SweRebenchInstance,
  deps: RunTaskDependencies
): Promise<TaskExecutionArtifacts> {
  const start = (deps.now ?? Date.now)();
  const before = await deps.executeBefore(instance);
  const after = await deps.executeAfter(instance);
  const runtimeSeconds = ((deps.now ?? Date.now)() - start) / 1000;

  const patchSuccess = after.failed === 0 && after.failToPassPassed >= before.failToPassPassed;

  const report = {
    instance_id: instance.instance_id,
    repo: instance.repo,
    base_commit: instance.base_commit,
    image_name: instance.image_name,
    patch_success: patchSuccess,
  };

  const metrics = {
    tests_passed_before: before.passed,
    tests_passed_after: after.passed,
    tests_failed_before: before.failed,
    tests_failed_after: after.failed,
    fail_to_pass_before: before.failToPassPassed,
    fail_to_pass_after: after.failToPassPassed,
    regressions: after.regressions,
    runtime_seconds: Number(runtimeSeconds.toFixed(3)),
  };

  const stamp = {
    instance_id: instance.instance_id,
    schema_version: '1.0.0',
  };

  const outputRoot = deps.outputRoot ?? path.join(process.cwd(), 'evaluation/results/swe');
  const outputDir = path.join(outputRoot, instance.instance_id);
  await mkdir(outputDir, { recursive: true });

  await writeFile(path.join(outputDir, 'report.json'), stableStringify(report), 'utf8');
  await writeFile(path.join(outputDir, 'metrics.json'), stableStringify(metrics), 'utf8');
  await writeFile(path.join(outputDir, 'stamp.json'), stableStringify(stamp), 'utf8');

  return { report, metrics, stamp };
}
