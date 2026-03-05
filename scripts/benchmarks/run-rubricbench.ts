import * as fs from 'fs';
import * as path from 'path';
import { loadRubricBenchDataset } from '../../src/datasets/rubricbench/loader';
import { scoreOutput } from '../../src/evals/rubrics/evaluator';
import { AtomicRubric } from '../../src/evals/rubrics/schema';

// Helper to convert string criteria into AtomicRubric objects
function toAtomicRubrics(criteria: string[]): AtomicRubric[] {
  return criteria.map((criterion, index) => ({
    id: `rubric-${index}`,
    criterion,
    weight: 1.0 // Equal weighting for benchmark simulation
  }));
}

async function runBenchmark() {
  console.log("Starting RubricBench evaluation...");
  const dataset = loadRubricBenchDataset();

  let totalModelScoreA = 0;
  let totalModelScoreB = 0;

  const results = dataset.map((item, index) => {
    const rubrics = toAtomicRubrics(item.rubrics);

    // Simulate model output alignment
    const scoreA = scoreOutput(rubrics, item.output_a);
    const scoreB = scoreOutput(rubrics, item.output_b);

    totalModelScoreA += scoreA;
    totalModelScoreB += scoreB;

    // Compare with human preference
    const predictedPreference = scoreA > scoreB ? "A" : "B";
    const matchesHuman = predictedPreference === item.human_preference;

    return {
      id: `task-${index}`,
      instruction: item.instruction,
      score_a: scoreA,
      score_b: scoreB,
      predicted_preference: predictedPreference,
      human_preference: item.human_preference,
      matches_human: matchesHuman
    };
  });

  // Calculate high-level metrics
  const correctPredictions = results.filter(r => r.matches_human).length;
  const humanAlignment = correctPredictions / results.length;
  const avgScoreA = totalModelScoreA / results.length;
  const avgScoreB = totalModelScoreB / results.length;

  // Dummy "rubric_alignment" metric representing general rubric reliability
  const rubricAlignment = (avgScoreA + avgScoreB) / 2;

  const metrics = {
    model: "mock-evaluator",
    rubric_alignment: parseFloat(rubricAlignment.toFixed(2)),
    human_alignment: parseFloat(humanAlignment.toFixed(2)),
    gap: parseFloat((humanAlignment - rubricAlignment).toFixed(2)),
    total_samples: results.length
  };

  // Write artifacts
  const artifactsDir = path.resolve('artifacts/rubricbench');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(artifactsDir, 'metrics.json'),
    JSON.stringify(metrics, null, 2)
  );

  fs.writeFileSync(
    path.join(artifactsDir, 'report.json'),
    JSON.stringify(results, null, 2)
  );

  console.log("Benchmark completed. Metrics:");
  console.dir(metrics);
}

runBenchmark().catch(console.error);
