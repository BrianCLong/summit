# Architecture: UniReason 1.0 (Dual Reasoning Loop)

## Pipeline Overview
The UniReason 1.0 implementation in Summit follows a dual-stage reasoning pattern:

```text
[Input] -> [PLAN] -> [DRAFT] -> [VERIFY] -> [REFINE] -> [JUDGE] -> [Output]
             ^                  |           |           |
             |                  +-----------+-----------+
             |                           FEEDBACK LOOP
             +-------------------------------------------+
```

## Components

### 1. Plan (World-Knowledge Planning)
Injects implicit constraints based on the knowledge domain (Cultural, Science, Spatial, Temporal, Logical). This ensures the generation is grounded in world knowledge from the start.

### 2. Verify (Agentic Verifier)
A specialized agent role that diagnoses mismatches between the instruction/plan and the draft. It evaluates across dimensions like object presence, attribute accuracy, style consistency, and realism.

### 3. Refine (Editing-like Refinement)
Instead of regenerating from scratch, the system applies editing-like operations to refine the draft based on the verifier's feedback.

### 4. Judge
A final evaluation step that compares the original draft and the refined version, selecting the best one and providing a rationale for the improvement.

## Determinism and Security
*   **EvidenceID:** SHA256(canonical(inputs + report)).
*   **Redaction:** Deny-by-default policy for all prompts and outputs.
*   **Timestamps:** Strictly isolated from evidence artifacts to ensure CI reproducibility.
