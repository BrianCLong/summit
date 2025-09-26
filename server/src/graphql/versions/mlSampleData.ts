export interface BaseModelOutput {
  id: string;
  label: string;
  confidence: number;
  uncertainty: number;
  sampleSize: number;
  explanations: string[];
  rawOutput: Record<string, unknown>;
}

export const sampleModelOutputs: BaseModelOutput[] = [
  {
    id: 'ml-output-1',
    label: 'threat-actor',
    confidence: 0.92,
    uncertainty: 0.04,
    sampleSize: 128,
    explanations: [
      'High similarity to known threat actor signatures.',
      'Temporal correlation with elevated telemetry anomalies.',
    ],
    rawOutput: {
      provider: 'summit-ml',
      model: 'threat-detector-v2',
      topWeights: [
        ['geo-distribution', 0.31],
        ['linguistic-shift', 0.27],
        ['payload-match', 0.18],
      ],
    },
  },
  {
    id: 'ml-output-2',
    label: 'benign-campaign',
    confidence: 0.61,
    uncertainty: 0.22,
    sampleSize: 86,
    explanations: [
      'Engagement metrics are consistent with organic behavior.',
      'Content sentiment falls within expected baseline.',
    ],
    rawOutput: {
      provider: 'summit-ml',
      model: 'narrative-monitor-v5',
      topWeights: [
        ['sentiment-neutrality', 0.42],
        ['engagement-velocity', 0.24],
        ['network-centrality', 0.19],
      ],
    },
  },
];

export const legacySummary = (explanations: string[]): string | null =>
  explanations.length ? explanations[0] : null;
