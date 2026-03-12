# GraphRAG Evaluation Harness

This directory contains the evaluation harness for measuring the quality of GraphRAG responses.

## Structure

- `evaluator.js`: The main script that runs the evaluation. It supports a custom provider for real service integration.
- `reporter.js`: Generates a Markdown report from the evaluation results.
- `../fixtures/graphrag_test_cases.json`: The test question bank (20+ cases).
- `../utils/metrics.js`: Implementation of evaluation metrics.

## Metrics

The harness measures quality across four key dimensions:

1.  **Completeness**: Percentage of expected entities present in the response.
2.  **Citation Accuracy**: Verification that cited entities are actually present in the response.
3.  **Relevance**: Keyword overlap between the response and the query intent.
4.  **Confidence Calibration**: Correlation between the stated confidence and actual accuracy.

## Usage

### Local Testing with Default Mock

To run the evaluation using the default mock provider and generate a report:

```bash
node evals/graphrag/evaluator.js
node evals/graphrag/reporter.js
```

### Integrating with Real Service

You can import `runEvaluation` from `evaluator.js` and provide a custom service provider:

```javascript
import { runEvaluation } from './evaluator.js';

async function myProvider(question, groundTruth) {
  // Call your GraphRAG service here...
  return { response, confidence, cited_entities };
}

runEvaluation(myProvider);
```

## Outputs

The outputs are generated in `evals/graphrag/eval_report.json` and `evals/graphrag/eval_report.md` (these files are gitignored).
