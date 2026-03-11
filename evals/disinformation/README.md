# Disinformation Detection Evaluation Harness

This harness tests Summit's ability to detect various disinformation patterns in source documents and query responses.

## Scenarios Tested

- **False Claims:** Documents containing known false claims (fact-checked as false).
- **Coordinated Inauthentic Behavior (CIB):** Multiple sources repeating identical or highly similar phrasing.
- **Source Credibility:** Scoring based on source reliability metrics.
- **Contradictions:** Identifying when the same asset is used to support opposing stances.
- **Narrative Manipulation:** Detecting tactics such as strawman and false equivalence.

## Directory Structure

- `harness.py`: The main evaluation script.
- `../fixtures/disinformation/`: Labeled test corpus.

## Running the Evaluation

To run the evaluation harness and generate a report:

```bash
python evals/disinformation/harness.py
```

## Output

The harness computes:
- **Detection Accuracy**: Overall correct classifications.
- **False Positive Rate (FPR)**: Rate at which benign content is flagged as disinformation.

Results are saved to `disinfo_eval_report.json`.
