import fs from 'node:fs/promises';
import path from 'node:path';
import { DeterministicResult, RubricResult, ScoreSummary } from './types.js';
import { readJson, writeJson } from './filesystem.js';

const scoreWeights = {
  deterministic: 0.7,
  rubric: 0.3,
};

const safeNumber = (value: number | null): number => value ?? 0;

export const combineScores = (
  skill: string,
  runId: string,
  deterministic: DeterministicResult,
  rubric: RubricResult,
  baselineScore: number | null,
  dropThreshold: number,
): ScoreSummary => {
  const combinedScore =
    deterministic.score * scoreWeights.deterministic +
    rubric.score * scoreWeights.rubric;
  const delta = baselineScore === null ? null : combinedScore - baselineScore;
  const regressionPass =
    delta === null ? true : delta >= -Math.abs(dropThreshold);
  const overallPass =
    deterministic.overall_pass && rubric.overall_pass && regressionPass;

  return {
    skill,
    run_id: runId,
    deterministic,
    rubric,
    combined_score: Math.round(combinedScore),
    overall_pass: overallPass,
    regression: {
      baseline_score: baselineScore,
      delta,
      drop_threshold: dropThreshold,
      pass: regressionPass,
    },
  };
};

export const loadBaselineScore = async (
  baselinePath: string,
): Promise<number | null> => {
  try {
    const baseline = await readJson<{ combined_score: number }>(baselinePath);
    return baseline.combined_score;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
    }
    throw error;
  }
};

export const persistScore = async (
  outputPath: string,
  summary: ScoreSummary,
): Promise<void> => {
  await writeJson(outputPath, summary);
};

export const persistScoreHistory = async (
  historyDir: string,
  runId: string,
  summary: ScoreSummary,
): Promise<void> => {
  await fs.mkdir(historyDir, { recursive: true });
  const historyPath = path.join(historyDir, `${runId}.json`);
  await writeJson(historyPath, summary);
};

export const computeSuiteScore = (
  summaries: ScoreSummary[],
): {
  score: number;
  overall_pass: boolean;
} => {
  if (summaries.length === 0) {
    return { score: 0, overall_pass: false };
  }
  const total = summaries.reduce(
    (acc, summary) => acc + summary.combined_score,
    0,
  );
  const score = Math.round(total / summaries.length);
  const overallPass = summaries.every((summary) => summary.overall_pass);
  return { score, overall_pass: overallPass };
};

export const summarizeChecks = (
  deterministic: DeterministicResult,
  rubric: RubricResult,
): { pass: number; fail: number } => {
  const checks = [...deterministic.checks, ...rubric.checks];
  return checks.reduce(
    (acc, check) => {
      if (check.pass) {
        acc.pass += 1;
      } else {
        acc.fail += 1;
      }
      return acc;
    },
    { pass: 0, fail: 0 },
  );
};

export const formatDelta = (delta: number | null): string => {
  if (delta === null) {
    return 'n/a';
  }
  const rounded = Math.round(delta * 100) / 100;
  return `${rounded >= 0 ? '+' : ''}${rounded}`;
};

export const toPercent = (value: number): number => Math.round(value * 100);

export const weightedScore = (score: number): number => {
  const normalized = Math.min(Math.max(score, 0), 100);
  return Math.round(normalized);
};

export const sumScores = (...scores: Array<number | null>): number =>
  scores.reduce((acc, score) => acc + safeNumber(score), 0);
