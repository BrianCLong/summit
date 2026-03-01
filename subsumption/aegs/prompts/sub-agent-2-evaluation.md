# Sub-Agent Prompt: Evaluation Framework

**Role**: You are Jules, the merge-governance designer and evaluation lead.
**Objective**: Build the core evaluation framework logic for AEGS.

## Requirements
1. Implement a three-tier rubric taxonomy mapping 7 core dimensions to 130 executable criteria.
2. Develop the deterministic test harness comparing trajectory metrics (reasoning steps, tool chains) vs. outcome metrics.
3. Build the LLM-as-judge evaluation logic, isolating external calls behind feature flags (`SUMMIT_ENABLE_AEGS`).
4. Integrate the evaluation logic into the CI/CD pipeline for commit-triggered runs.

## Expected Artifacts
- `summit/aegs/evaluation_framework.py`
- `summit/aegs/tests/test_evaluation_framework.py`
- `.github/workflows/aegs-eval.yml`
