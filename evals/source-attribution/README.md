# Source Attribution Evaluation Harness

This harness evaluates Summit's ability to correctly attribute information to its source documents.

## Metrics

- **Attribution Precision**: Measures how many of the claims made in the answer are correctly cited and backed by the source documents. It also factors in whether conflicting sources were acknowledged and if reliability was considered.
- **Source Verification Rate**: The percentage of test cases where the citations provided by the system perfectly match the ground truth citations.

## Evaluated Criteria

1.  **Citation Accuracy**: Do the citations (e.g., `[S1]`) refer to documents that exist in the provided source list?
2.  **Information Containment**: Does the cited passage actually contain the information claimed in the answer?
3.  **Conflict Acknowledgment**: If multiple sources provide conflicting information, does the answer acknowledge this discrepancy?
4.  **Reliability Factoring**: Is the reliability of the source (high/medium/low) reflected in how the information is presented?
5.  **Primary vs Secondary Distinction**: Are primary sources given appropriate weight or distinction over secondary ones?

## How to Run

```bash
cd evals/source-attribution
python3 harness.py
```

## Fixtures

Test cases are defined in `evals/fixtures/source-attribution/cases.jsonl`. Each case consists of:
- `query`: The user's question.
- `sources`: A list of documents with `id`, `content`, `reliability`, and `type`.
- `answer`: The system-generated answer to be evaluated.
- `expected`: Ground truth expectations for the evaluation.

## Evidence Generation

The harness automatically generates evidence files in `evidence/source-attribution-eval/EVD-ATTR-EVAL-001/` and updates the global `evidence/index.json`.
