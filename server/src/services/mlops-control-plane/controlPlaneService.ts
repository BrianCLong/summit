import {
  mlopsAgentReportGenerationTotal,
  mlopsCacheHitsTotal,
  mlopsCacheMissesTotal,
  mlopsDriftDetectedTotal,
  mlopsInferRequestsTotal,
  mlopsTrainBaseRequestsTotal,
  mlopsTrainDerivedRequestsTotal,
} from '../../monitoring/metrics.js';
import {
  buildPredictionCache,
  type PredictionCache,
} from './predictionCache.js';
import { MemoryDriftDetector, type DriftDetector } from './driftDetector.js';
import { InMemoryReportStore, type ReportStore } from './reportStore.js';
import {
  evaluateReport,
  generateAgentReport,
} from './reporting.js';
import type {
  AgentReport,
  FeatureSummary,
  InferRequest,
  PredictionOutput,
  TrainRequestBase,
  TrainRequestDerived,
  TrainResponse,
} from './types.js';

const DEFAULT_PREDICTION_TTL_SECONDS = Number(
  process.env.MLOPS_PREDICTION_TTL_SECONDS || 900,
);
const DEFAULT_REPORT_TTL_SECONDS = Number(
  process.env.MLOPS_REPORT_TTL_SECONDS || 3600,
);
const DEFAULT_DRIFT_THRESHOLD = Number(
  process.env.MLOPS_DRIFT_THRESHOLD || 25,
);

const safeInc = (metric: { inc?: (labels?: Record<string, string>) => void }, labels?: Record<string, string>) => {
  if (metric?.inc) {
    metric.inc(labels);
  }
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildFeatureSummary = (features: Record<string, unknown>): FeatureSummary => {
  let numericFeatureCount = 0;
  let numericFeatureSum = 0;
  let stringFeatureCount = 0;

  const keys = Object.keys(features).sort();

  for (const key of keys) {
    const value = features[key];
    if (typeof value === 'number') {
      numericFeatureCount += 1;
      numericFeatureSum += value;
    } else if (typeof value === 'string') {
      stringFeatureCount += 1;
    }
  }

  const fingerprintSource = `${keys.join('|')}:${numericFeatureCount}:${stringFeatureCount}`;

  return {
    numericFeatureCount,
    numericFeatureSum,
    stringFeatureCount,
    featureFingerprint: String(hashString(fingerprintSource)),
  };
};

const deterministicPredictor = (
  entityId: string,
  modelVersion: string,
  features: Record<string, unknown>,
): PredictionOutput => {
  const summary = buildFeatureSummary(features);
  const scoreSeed = hashString(`${entityId}:${modelVersion}:${summary.featureFingerprint}`);
  const score = Number(((scoreSeed % 1000) / 1000).toFixed(3));
  const riskLabel = score >= 0.66 ? 'high' : score >= 0.33 ? 'medium' : 'low';

  return {
    entityId,
    modelVersion,
    score,
    riskLabel,
    featureSummary: summary,
  };
};

export class MLOpsControlPlaneService {
  constructor(
    private readonly predictionCache: PredictionCache,
    private readonly reportStore: ReportStore,
    private readonly driftDetector: DriftDetector,
    private readonly predictionTtlSeconds = DEFAULT_PREDICTION_TTL_SECONDS,
    private readonly reportTtlSeconds = DEFAULT_REPORT_TTL_SECONDS,
  ) {}

  static createDefault(): MLOpsControlPlaneService {
    return new MLOpsControlPlaneService(
      buildPredictionCache(),
      new InMemoryReportStore(),
      new MemoryDriftDetector(DEFAULT_DRIFT_THRESHOLD),
    );
  }

  async trainBase(request: TrainRequestBase): Promise<TrainResponse> {
    safeInc(mlopsTrainBaseRequestsTotal);
    return {
      status: 'accepted',
      modelVersion: request.baseModelVersion,
      stage: 'base',
    };
  }

  async trainDerived(request: TrainRequestDerived): Promise<TrainResponse> {
    safeInc(mlopsTrainDerivedRequestsTotal);
    return {
      status: 'accepted',
      modelVersion: request.derivedModelVersion,
      stage: 'derived',
    };
  }

  async infer(request: InferRequest): Promise<{ report: AgentReport } | { error: string }> {
    safeInc(mlopsInferRequestsTotal);
    const features = request.features ?? {};

    let prediction = await this.predictionCache.get(
      request.entityId,
      request.modelVersion,
    );

    if (prediction) {
      safeInc(mlopsCacheHitsTotal);
    } else {
      safeInc(mlopsCacheMissesTotal);
      prediction = deterministicPredictor(
        request.entityId,
        request.modelVersion,
        features,
      );
      await this.predictionCache.set(
        request.entityId,
        request.modelVersion,
        prediction,
        this.predictionTtlSeconds,
      );
    }

    if (this.driftDetector.evaluate(request.entityId, prediction.featureSummary)) {
      safeInc(mlopsDriftDetectedTotal);
    }

    const report = generateAgentReport(prediction, request.context ?? {});
    const evaluation = evaluateReport(report, prediction);
    if (!evaluation.ok) {
      safeInc(mlopsAgentReportGenerationTotal, { status: 'failure' });
      return { error: evaluation.errors.join(' ') };
    }

    await this.reportStore.set(
      request.entityId,
      report,
      this.reportTtlSeconds,
    );
    safeInc(mlopsAgentReportGenerationTotal, { status: 'success' });

    return { report };
  }

  async getReport(entityId: string): Promise<AgentReport | null> {
    return this.reportStore.get(entityId);
  }

  async flushCaches(): Promise<{ predictions: number; reports: number }> {
    const [predictions, reports] = await Promise.all([
      this.predictionCache.flush(),
      this.reportStore.flush(),
    ]);
    return { predictions, reports };
  }
}
