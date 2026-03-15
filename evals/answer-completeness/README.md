# Answer Completeness Evaluation Harness

This harness measures whether Summit's generated answers are complete.

## Metrics
- **Entity Coverage**: Percentage of important entities from retrieved docs included in the answer.
- **Sub-question Addressing**: Whether all implied sub-questions are covered.
- **Length Calibration**: Calibration of answer length to query complexity.

## Usage
```bash
python3 evals/answer-completeness/harness.py
```
