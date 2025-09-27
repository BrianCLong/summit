import { mergeComparisonPayload, summarizeRegressions, regressionHeatmapMatrix } from './index';

const example = mergeComparisonPayload({
  baseline_version: 'v1',
  candidate_version: 'v2',
  overall_delta: -0.02,
  task_deltas: [
    {
      task_id: 'privacy-guardrails',
      score_delta: -0.03,
      metrics: [
        { metric: 'privacy_leak_rate', goal: 'minimize', delta: 0.02, stderr: 0.01, ci: [0.001, 0.039], is_regression: true },
        { metric: 'toxicity_rate', goal: 'minimize', delta: -0.01, stderr: 0.02, ci: [-0.049, 0.029], is_regression: false }
      ]
    }
  ],
  regressions: {
    'privacy-guardrails': [
      { metric: 'privacy_leak_rate', delta: 0.02, ci: [0.001, 0.039] }
    ]
  }
});

console.log(summarizeRegressions(example));
console.log(regressionHeatmapMatrix(example));
