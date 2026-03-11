import * as fs from 'fs';
import * as path from 'path';
import {
  calculateCompleteness,
  calculateCitationAccuracy,
  calculateRelevance,
  calculateConfidenceCalibration
} from '../utils/metrics.js';

/**
 * Default mock GraphRAG response generator for evaluation.
 * Users can replace this by passing a custom implementation to runEvaluation.
 */
function defaultMockProvider(question, groundTruth) {
  const response = `Based on current intelligence, ${groundTruth}`;
  const confidence = 0.85;
  const cited_entities = groundTruth.split(', ').map(e => e.replace('.', '').trim());

  return Promise.resolve({ response, confidence, cited_entities });
}

/**
 * Main evaluation runner.
 * @param {Function} provider - Async function (question, groundTruth) => { response, confidence, cited_entities }
 */
async function runEvaluation(provider = defaultMockProvider) {
  const fixturesPath = path.join(process.cwd(), 'evals/fixtures/graphrag_test_cases.json');
  const testCases = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

  const results = [];

  for (const testCase of testCases) {
    const { response, confidence, cited_entities } = await provider(testCase.question, testCase.ground_truth);

    const completeness = calculateCompleteness(response, testCase.expected_entities);
    const citation_accuracy = calculateCitationAccuracy(response, cited_entities);
    const relevance = calculateRelevance(response, testCase.intent);
    const confidence_calibration = calculateConfidenceCalibration(confidence, completeness);

    const overall = (completeness + citation_accuracy + relevance + confidence_calibration) / 4;

    results.push({
      case_id: testCase.id,
      scores: {
        completeness,
        citation_accuracy,
        relevance,
        confidence_calibration
      },
      overall
    });
  }

  const totalScore = results.reduce((acc, curr) => acc + curr.overall, 0) / results.length;

  const report = {
    timestamp: new Date().toISOString(),
    total_cases: results.length,
    overall_quality_score: totalScore,
    results
  };

  const reportPath = path.join(process.cwd(), 'evals/graphrag/eval_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Evaluation complete. Overall quality score: ${totalScore.toFixed(2)}`);
  console.log(`Detailed report written to: ${reportPath}`);
}

// Support running directly from CLI or importing
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('evaluator.js')) {
  runEvaluation().catch(console.error);
}

export { runEvaluation };
