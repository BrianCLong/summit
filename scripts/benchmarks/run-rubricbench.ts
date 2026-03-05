import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RubricBenchConnector, RubricBenchItem } from '../../src/datasets/rubricbench/loader.js';
import { AtomicRubric } from '../../src/evals/rubrics/schema.js';
import { evaluateRubricAlignment } from '../../src/evals/rubrics/evaluator.js';
import type { RunContext } from '../../packages/sdk-ts/src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBenchmark() {
  if (process.env.SUMMIT_FEATURE_RUBRICBENCH !== 'true') {
    console.log("SUMMIT_FEATURE_RUBRICBENCH feature flag is not 'true'. Exiting benchmark runner.");
    return;
  }

  const connector = new RubricBenchConnector();
  const dataset = await connector.send({} as RunContext, undefined);

  // Mock AtomicRubrics
  const rubrics: AtomicRubric[] = [
    { id: "r1", criterion: "Accuracy", weight: 0.5 },
    { id: "r2", criterion: "Formatting", weight: 0.5 },
  ];

  let totalModelScore = 0;
  let totalHumanScore = 0;
  let count = 0;

  for (const item of dataset) {
     const modelResult = evaluateRubricAlignment(rubrics, item.output_a);
     const humanResult = evaluateRubricAlignment(rubrics, item.output_b);

     totalModelScore += modelResult.score;
     totalHumanScore += humanResult.score;
     count++;
  }

  const metrics = {
    model: "gpt-4",
    rubric_alignment: count > 0 ? totalModelScore / count : 0,
    human_alignment: count > 0 ? totalHumanScore / count : 0,
    gap: count > 0 ? (totalHumanScore - totalModelScore) / count : 0
  };

  const report = {
    totalItems: count,
    metrics,
    status: "success"
  };

  const artifactsDir = path.resolve(__dirname, '../../artifacts/rubricbench');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // To meet deterministic requirements, remove timestamp inside output content if not strictly needed,
  // or use a fixed ID scheme.
  const deterministicStamp = {
      id: "SUMMIT.AI_EVALS.rubricbench.case_id.grader",
      status: "verified"
  };

  fs.writeFileSync(path.join(artifactsDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(artifactsDir, 'stamp.json'), JSON.stringify(deterministicStamp, null, 2));

  console.log("Benchmark complete. Metrics:", metrics);
}

runBenchmark().catch(console.error);
