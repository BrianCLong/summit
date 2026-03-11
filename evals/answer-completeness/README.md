# Answer Completeness Evaluation Harness

This harness measures whether generated answers are complete and cover all relevant aspects of the user's query based on retrieved context.

## Evaluation Criteria

The harness evaluates each answer against the following dimensions:

1.  **Entity Coverage**: Percentage of expected entities (mentioned in retrieved context) that are present in the answer.
2.  **Sub-question Coverage**: Heuristic assessment of whether all sub-questions implied by the query are addressed.
3.  **Critical Context Omission**: Measures if key phrases from specified "critical context" are missing from the answer.
4.  **Length Calibration**: Heuristic that compares answer length to query complexity (derived from entities and sub-questions).
5.  **Relationship Surfacing**: Checks if key relationships between entities are expressed in the answer.

## Metrics

- **Completeness Score**: An aggregate score (0.0 to 1.0) across all dimensions.
- **Omission Rate**: 1.0 minus the critical context score, indicating how much vital information was left out.

## Usage

To run the evaluation:

```bash
python3 evals/answer-completeness/harness.py
```

## Fixtures

Test cases are defined in `evals/fixtures/answer-completeness/fixtures.jsonl`. Each entry should follow this schema:

```json
{
  "id": "EVAL-ID",
  "query": "The user query",
  "retrieved_context": "The context provided to the model",
  "generated_answer": "The answer to evaluate",
  "expected_entities": ["List", "of", "entities"],
  "sub_questions": ["Implied", "questions"],
  "critical_context": "Vital information that must be included",
  "relationships": ["Entity A relates to Entity B"]
}
```

## Evidence

Running the harness generates evidence artifacts in `evidence/EVD-COMPLETENESS-EVAL-*` and updates `evidence/index.json`.
