# Disinformation Detection Evaluation Harness

This harness tests Summit's ability to detect disinformation patterns in source documents.

## Scenarios
- False claims (fact-checked as false)
- Coordinated inauthentic behavior (CIB) signals
- Source credibility scoring
- Contradictions between sources
- Narrative manipulation tactics (strawman, false equivalence)

## Running the Evaluation
```bash
python3 evals/disinformation/harness.py
```
