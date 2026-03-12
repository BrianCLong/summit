# Ingestion Pipeline Evaluation Harness

This harness is used to evaluate the quality and performance of Summit's document ingestion pipeline.

## Overview

The ingestion harness operates entirely on a static, fixed corpus of test documents without making any external API requests. It evaluates:

1. **Throughput**: Measures documents processed per second.
2. **Parse Accuracy**: Compares the pipeline's extracted text output against deterministic gold standard strings to ensure no semantic loss during parsing.
3. **Chunking Quality**: Calculates statistical metrics on text chunk sizes.
4. **Embedding Coverage**: Ensures that all non-empty processed text is accounted for by the embedder.

## Directory Structure

* `harness.py`: The main evaluation runner script.
* `fixtures/`: Contains the static test document corpus (JSON format).
* `fixtures/gold/`: Contains the expected text output standards corresponding to the test documents.

## Running the Evaluation

To execute the harness, run it standalone from the project root:

```bash
PYTHONPATH=. python evals/ingestion/harness.py
```

The script will output the results to the console. Example output:

```text
Initializing evaluation harness...
Loaded 2 documents for evaluation.

--- Ingestion Pipeline Evaluation Results ---
Total Documents: 2
Time Taken: 0.0001 seconds
Throughput: 13434.90 docs/sec
Parse Accuracy: 100.00%
Total Simulated Chunks: 24
Average Chunk Size (chars): 29.38
Simulated Embedding Coverage: 100.00%
All metrics passed threshold validations.
```

## Adding New Fixtures

To add new documents to the evaluation corpus:
1. Create a new `.json` file in `fixtures/` (e.g. `doc3.json`).
2. Run the pipeline manually on `doc3.json` to obtain the expected output, or manually create the expected standard.
3. Save the expected string to `fixtures/gold/doc3_gold.txt`.
