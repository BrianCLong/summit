import fs from 'fs';
import path from 'path';

export interface FixtureEntity {
  id: string;
  labels: string[];
  properties: Record<string, any>;
  lacLabels?: string[];
}

export interface FixturePair {
  id: string;
  entityA: FixtureEntity;
  entityB: FixtureEntity;
  isMatch: boolean;
}

export interface FixtureDataset {
  datasetId: string;
  description?: string;
  pairs: FixturePair[];
}

export interface GuardrailMetrics {
  precision: number;
  recall: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  totalPairs: number;
}

export interface GuardrailThresholds {
  minPrecision: number;
  minRecall: number;
  matchThreshold: number;
}

export interface GuardrailResult {
  datasetId: string;
  metrics: GuardrailMetrics;
  thresholds: GuardrailThresholds;
  passed: boolean;
  evaluatedAt: string;
}

const DEFAULT_FIXTURES_PATH = path.join(
  process.cwd(),
  'tests/fixtures/er/evaluation-fixtures.json'
);

let cachedFixtures: FixtureDataset[] | null = null;

export function loadFixtures(fixturesPath?: string): FixtureDataset[] {
  const resolvedPath = fixturesPath || process.env.ER_GUARDRAIL_FIXTURES_PATH || DEFAULT_FIXTURES_PATH;
  if (cachedFixtures && resolvedPath === DEFAULT_FIXTURES_PATH) {
    return cachedFixtures;
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as { datasets: FixtureDataset[] };
  if (!parsed.datasets || !Array.isArray(parsed.datasets)) {
    throw new Error('ER guardrail fixtures missing datasets');
  }

  if (resolvedPath === DEFAULT_FIXTURES_PATH) {
    cachedFixtures = parsed.datasets;
  }

  return parsed.datasets;
}

export function getDataset(
  datasetId: string,
  fixtures?: FixtureDataset[]
): FixtureDataset {
  const datasets = fixtures || loadFixtures();
  const dataset = datasets.find(item => item.datasetId === datasetId);
  if (!dataset) {
    throw new Error(`ER guardrail dataset not found: ${datasetId}`);
  }
  return dataset;
}

export function computeMetrics(
  dataset: FixtureDataset,
  scoreFn: (entityA: FixtureEntity, entityB: FixtureEntity) => number,
  matchThreshold: number
): GuardrailMetrics {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const pair of dataset.pairs) {
    const score = scoreFn(pair.entityA, pair.entityB);
    const predictedMatch = score >= matchThreshold;

    if (predictedMatch && pair.isMatch) {
      truePositives += 1;
    } else if (predictedMatch && !pair.isMatch) {
      falsePositives += 1;
    } else if (!predictedMatch && pair.isMatch) {
      falseNegatives += 1;
    }
  }

  const precisionDenominator = truePositives + falsePositives;
  const recallDenominator = truePositives + falseNegatives;

  return {
    precision:
      precisionDenominator === 0 ? 0 : truePositives / precisionDenominator,
    recall: recallDenominator === 0 ? 0 : truePositives / recallDenominator,
    truePositives,
    falsePositives,
    falseNegatives,
    totalPairs: dataset.pairs.length,
  };
}

export function resolveThresholds(): GuardrailThresholds {
  const minPrecision = Number.parseFloat(
    process.env.ER_GUARDRAIL_MIN_PRECISION || '0.85'
  );
  const minRecall = Number.parseFloat(
    process.env.ER_GUARDRAIL_MIN_RECALL || '0.8'
  );
  const matchThreshold = Number.parseFloat(
    process.env.ER_GUARDRAIL_MATCH_THRESHOLD || '0.8'
  );

  return {
    minPrecision,
    minRecall,
    matchThreshold,
  };
}

export function evaluateGuardrails(
  datasetId: string,
  scoreFn: (entityA: FixtureEntity, entityB: FixtureEntity) => number,
  fixtures?: FixtureDataset[]
): GuardrailResult {
  const dataset = getDataset(datasetId, fixtures);
  const thresholds = resolveThresholds();
  const metrics = computeMetrics(dataset, scoreFn, thresholds.matchThreshold);
  const passed =
    metrics.precision >= thresholds.minPrecision &&
    metrics.recall >= thresholds.minRecall;

  return {
    datasetId,
    metrics,
    thresholds,
    passed,
    evaluatedAt: new Date().toISOString(),
  };
}
