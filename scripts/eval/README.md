# GraphRAG Evaluation Harness

This directory contains the GraphRAG evaluation harness which measures the retrieval quality of Summit's GraphRAG system.

## Overview
The evaluation harness runs a set of ground-truth question-answer pairs against the live system (or an integration target) to compute retrieval performance metrics:
- **Recall@1:** The proportion of queries for which the expected target node was ranked first.
- **MRR (Mean Reciprocal Rank):** The average of the reciprocal ranks of the first relevant retrieved node.

## Running the Evaluation
The evaluation can be executed as a standalone script using Node.js:

```bash
node scripts/eval/run.js
```

## Interpreting the Results
Upon completion, the harness outputs its metrics to the console and generates an `eval_results.json` file in this directory.
This JSON file contains the detailed evaluation context, useful for CI tracking and regression analysis.

Example format:
```json
{
  "metrics": {
    "totalQueries": 10,
    "recallAt1": 1.0,
    "mrr": 1.0
  },
  "results": [ ... ]
}
```
