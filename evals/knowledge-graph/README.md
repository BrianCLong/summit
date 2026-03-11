# Knowledge Graph Evaluation Harness

This directory contains the evaluation harness for Summit's knowledge graph construction quality. It measures the performance of entity extraction, entity linking, and relation extraction against a set of gold-standard annotated documents.

## Directory Structure

- `evals/knowledge-graph/evaluate.mjs`: The standalone evaluation script.
- `evals/entity-extraction/fixtures/gold/`: Gold-standard annotated documents (JSON).
- `evals/entity-extraction/fixtures/predicted/`: Simulated or actual predicted documents for evaluation (JSON).

## Running the Evaluation

The evaluation harness can be run standalone with a single command. It requires no external dependencies beyond Node.js.

```bash
node evals/knowledge-graph/evaluate.mjs
```

## Interpreting the Results

When you run the script, it will output a human-readable summary to the console, showing the Precision, Recall, and F1 Score for entity and relation extraction, as well as the Accuracy for entity linking.

Example console output:

```
========================================
 Knowledge Graph Evaluation Summary
========================================

--- Entity Extraction ---
Precision: 100.00%
Recall:    87.50%
F1 Score:  93.33%

--- Entity Linking ---
Accuracy:  100.00% (6/6)

--- Relation Extraction ---
Precision: 100.00%
Recall:    66.67%
F1 Score:  80.00%

Full results saved to: /path/to/evals/knowledge-graph/results.json
```

A detailed JSON results file will also be generated at `evals/knowledge-graph/results.json`, containing the raw True Positives (TP), False Positives (FP), False Negatives (FN), and the calculated metrics for each category.
