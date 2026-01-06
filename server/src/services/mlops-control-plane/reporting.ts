import { z } from 'zod';
import type { AgentReport, PredictionOutput } from './types.js';

const reportSchema = z.object({
  schemaVersion: z.literal('mlops-control-plane-v1'),
  entityId: z.string().min(1),
  modelVersion: z.string().min(1),
  prediction: z.object({
    entityId: z.string().min(1),
    modelVersion: z.string().min(1),
    score: z.number(),
    riskLabel: z.enum(['low', 'medium', 'high']),
    featureSummary: z.object({
      numericFeatureCount: z.number(),
      numericFeatureSum: z.number(),
      stringFeatureCount: z.number(),
      featureFingerprint: z.string(),
    }),
  }),
  sections: z.object({
    summary: z.string().min(1),
    rationale: z.string().min(1),
    critique: z.string().min(1),
  }),
});

export const generateAgentReport = (
  prediction: PredictionOutput,
  context: Record<string, unknown>,
): AgentReport => {
  const contextKeys = Object.keys(context);
  const contextNote = contextKeys.length
    ? `Context keys observed: ${contextKeys.sort().join(', ')}`
    : 'No additional context provided.';

  const summary = `Deterministic score ${prediction.score.toFixed(3)} for ${prediction.entityId}. ${contextNote}`;
  const rationale = `Model version ${prediction.modelVersion} produced a ${prediction.riskLabel} risk label from deterministic features.`;
  const critique = 'Critique: report is constrained to cached prediction values and deterministic formatting.';

  return {
    schemaVersion: 'mlops-control-plane-v1',
    entityId: prediction.entityId,
    modelVersion: prediction.modelVersion,
    prediction,
    sections: {
      summary,
      rationale,
      critique,
    },
  };
};

export const evaluateReport = (
  report: AgentReport,
  expectedPrediction: PredictionOutput,
): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  const parsed = reportSchema.safeParse(report);
  if (!parsed.success) {
    errors.push('Report schema validation failed.');
    return { ok: false, errors };
  }

  if (report.prediction.score !== expectedPrediction.score) {
    errors.push('Prediction score mismatch.');
  }
  if (report.prediction.riskLabel !== expectedPrediction.riskLabel) {
    errors.push('Prediction risk label mismatch.');
  }
  if (report.prediction.modelVersion !== expectedPrediction.modelVersion) {
    errors.push('Prediction model version mismatch.');
  }

  return { ok: errors.length === 0, errors };
};
