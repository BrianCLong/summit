import { z } from 'zod';

export const simulationSuiteSchema = z.enum(['security_evals', 'anomaly_fixtures', 'api_integration']);
export type SimulationSuite = z.infer<typeof simulationSuiteSchema>;

export const simulationModeSchema = z.enum(['baseline', 'proposed']);
export type SimulationMode = z.infer<typeof simulationModeSchema>;

export const scenarioOutcomeSchema = z.enum(['allow', 'deny', 'require-approval', 'alert']);
export type ScenarioOutcome = z.infer<typeof scenarioOutcomeSchema>;

export const scenarioDeltaSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  suite: simulationSuiteSchema,
  previousOutcome: scenarioOutcomeSchema,
  currentOutcome: scenarioOutcomeSchema,
  category: z.string().optional(),
});
export type ScenarioDelta = z.infer<typeof scenarioDeltaSchema>;

export const anomalyDeltaSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  previousScore: z.number(),
  currentScore: z.number(),
  alertRaised: z.boolean(),
  severity: z.string().optional(),
});
export type AnomalyDelta = z.infer<typeof anomalyDeltaSchema>;

export const simulationMetricsSchema = z.object({
  scenarioPassRate: z.number().min(0).max(1),
  denyDeltaByCategory: z.record(z.number()).optional().default({}),
  falsePositiveIndicators: z.array(z.string()).default([]),
  securityPositiveIndicators: z.array(z.string()).default([]),
});
export type SimulationMetrics = z.infer<typeof simulationMetricsSchema>;

export const simulationRunResultSchema = z.object({
  suite: simulationSuiteSchema,
  mode: simulationModeSchema,
  passed: z.boolean(),
  summary: simulationMetricsSchema,
  deltas: z.object({
    scenarios: z.array(scenarioDeltaSchema).default([]),
    anomalies: z.array(anomalyDeltaSchema).default([]),
  }),
});
export type SimulationRunResult = z.infer<typeof simulationRunResultSchema>;

export const recommendationSchema = z.object({
  decision: z.enum(['approve', 'needs_review', 'reject']),
  rationale: z.string(),
  thresholds: z.record(z.string(), z.any()).optional(),
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const policySimulationReportSchema = z.object({
  proposalId: z.string(),
  policyTargets: z.array(z.string()).default([]),
  simulationRuns: z.array(simulationRunResultSchema),
  recommendation: recommendationSchema,
  evidenceRefs: z.array(z.string()).default([]),
  metadata: z.object({
    generatedAt: z.string(),
    seed: z.number().optional(),
    versions: z.object({
      runner: z.string(),
      policyBundleDigest: z.string(),
      baselineRef: z.string().optional(),
    }),
  }),
});
export type PolicySimulationReport = z.infer<typeof policySimulationReportSchema>;
