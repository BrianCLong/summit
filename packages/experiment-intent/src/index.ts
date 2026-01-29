export interface ExperimentParams {
  id: string;
  target_metric: string;
  expected_variance: number;
  sample_size: number;
}

export class LearningValueCalculator {
  public calculate(experiment: ExperimentParams): number {
    // Simplified Information Gain calculation
    // Value = (Variance Reduction Potential) * (Relevance of Metric)

    let relevance = 1.0;
    if (experiment.target_metric === 'user_retention') relevance = 2.0;
    if (experiment.target_metric === 'latency') relevance = 1.5;

    // Hypothetical calculation: higher variance means more to learn, larger sample size means more confidence
    const informationGain = experiment.expected_variance * Math.log(experiment.sample_size);

    return informationGain * relevance;
  }
}
