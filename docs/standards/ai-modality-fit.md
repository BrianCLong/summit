# AI Modality Fit Standard

This standard defines the appropriate use of AI modalities based on task requirements and risk profile.

## Principles

1.  **Determinism Rule**: If a task requires deterministic output (e.g., financial ledger, safety-critical control), Generative AI (GenAI) MUST NOT be the sole executor. Symbolic or Predictive AI should be used, or GenAI must be wrapped in a deterministic verification layer.
2.  **Risk Rule**: High regulatory exposure tasks require explicability and reproducibility that GenAI alone often cannot provide.

## Selection Matrix

| Task Requirement | Regulatory Exposure | Recommended Modality | Prohibited |
| :--- | :--- | :--- | :--- |
| Creative / Drafting | Low | GenAI | - |
| Classification | Low/Medium | Predictive / GenAI | - |
| Financial Calculation | High | Symbolic / Deterministic | GenAI (Unchecked) |
| Clinical Diagnosis | High | Predictive (Explainable) | GenAI (Blackbox) |

## Enforcement

This standard is enforced via `summit check modality-fit`, which validates the `ai_task_profile.json` evidence.
