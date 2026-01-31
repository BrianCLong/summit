import fs from 'node:fs/promises';
import path from 'node:path';
import { DeterministicResult, PromptCase, TraceEvent } from '../../../runner/types.js';

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

const findRunId = (trace: TraceEvent[]): string => trace[0]?.run_id ?? 'unknown';

const extractChangedPaths = (trace: TraceEvent[]): string[] => {
  const changes: string[] = [];
  trace
    .filter((event) => event.event_type === 'file_changes')
    .forEach((event) => {
      const entries = (event.data.changes as string[] | undefined) ?? [];
      entries.forEach((line) => {
        const trimmed = line.trim();
        const pathPart = trimmed.slice(3).trim();
        if (pathPart.length > 0) {
          changes.push(pathPart);
        }
      });
    });
  return changes;
};

export const grade = async ({
  trace,
  prompts,
  skillDir,
}: {
  trace: TraceEvent[];
  prompts: PromptCase[];
  skillDir: string;
  repoRoot: string;
}): Promise<DeterministicResult> => {
  const runId = findRunId(trace);
  const checks = [];
  let passed = 0;

  for (const promptCase of prompts) {
    const resultPath = path.join(
      skillDir,
      'artifacts',
      runId,
      promptCase.id,
      'result.json',
    );
    const result = await readJson<{ triggered: boolean }>(resultPath);
    const triggerPass = result.triggered === promptCase.expected_trigger;
    checks.push({
      id: `trigger-${promptCase.id}`,
      pass: triggerPass,
      notes: triggerPass
        ? undefined
        : `Expected trigger=${promptCase.expected_trigger} for ${promptCase.id}`,
    });
    if (triggerPass) {
      passed += 1;
    }

    const fixPath = path.join(
      skillDir,
      'artifacts',
      runId,
      promptCase.id,
      'ci-fix-summary.json',
    );
    const fixExists = await fs
      .access(fixPath)
      .then(() => true)
      .catch(() => false);
    const fixPass = result.triggered ? fixExists : !fixExists;
    checks.push({
      id: `artifact-${promptCase.id}`,
      pass: fixPass,
      notes: fixPass ? undefined : 'Unexpected CI fix artifact presence',
    });
    if (fixPass) {
      passed += 1;
    }
  }

  const changedPaths = extractChangedPaths(trace);
  const allowedPrefix = path.join('evals', 'skills', 'fix-failing-ci', 'artifacts');
  const invalidPaths = changedPaths.filter(
    (changed) => !changed.startsWith(allowedPrefix),
  );
  const pathPass = invalidPaths.length === 0;
  checks.push({
    id: 'artifact-boundary',
    pass: pathPass,
    notes: pathPass ? undefined : `Unexpected changes: ${invalidPaths.join(', ')}`,
  });
  if (pathPass) {
    passed += 1;
  }

  const totalChecks = checks.length;
  const score = Math.round((passed / totalChecks) * 100);
  return {
    overall_pass: checks.every((check) => check.pass),
    score,
    checks,
  };
};
