# Explainability Requirement Design

## Purpose

To transform "Explainability" from a passive documentation task into an active, system-enforced obligation. No analytic output is valid without a reconstructable path.

## Requirement: The "Reconstruction Key"

Every analytic output (assessment, alert, summary) must be accompanied by a `ReconstructionKey` object.

### Schema

```yaml
ReconstructionKey:
  output_id: "OUT-..."
  algorithm_version: "v1.2.3"
  input_snapshot_id: "SNP-..." (Reference to the exact state of inputs used)
  logic_trace:
    - step: "filtering"
      rationale: "removed low confidence sources (< 0.4)"
    - step: "correlation"
      method: "temporal_overlap"
      params: { window: "1h" }
  human_in_loop: boolean
  approver_id: "USR-..." (if applicable)
```

## Failure Mode (The "Black Box" Gate)

- **Gate:** CI/CD or Runtime Gate must block any output where `ReconstructionKey` is missing or invalid.
- **Enforcement:**
  - Automated Systems: Throw `UnexplainableOutputError` if trace is lost.
  - Human Analysts: Cannot publish report without linking to source graph snapshots.

## Failure Cases

- **Non-Deterministic Models:** LLMs or probabilistic models that cannot perfectly reproduce output from inputs.
  - *Mitigation:* Capture seed, temperature, and full prompt context. Accept "Probabilistic Reconstruction" with confidence intervals, but strictly log the *inputs*.
