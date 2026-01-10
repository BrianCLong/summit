# Witness Chain

**Purpose:** Provide a tamper-evident chain of commitments over processing steps, inputs, outputs,
policies, and execution environment.

## Structure

- Each entry references the previous entry hash to form a chain.
- Entries are anchored in an append-only ledger (e.g., transparency log).

```json
{
  "session_id": "wtn_...",
  "entries": [
    {
      "step": 1,
      "action": "transform/normalize",
      "inputs": ["ev_1", "ev_2"],
      "outputs": ["norm_1"],
      "policy_decision_id": "pdt_...",
      "determinism_token": "det_...",
      "commitment": "sha256(...)",
      "prev_commitment": "sha256(prev)",
      "timestamp": "2025-12-30T23:59:59Z"
    }
  ]
}
```

## Required Commitments

- Hash commitments to inputs and outputs.
- Policy decision identifier(s).
- Determinism token(s) when replay is supported.

## Integrity Guarantees

- Any alteration to a step invalidates downstream commitments.
- Optional anchoring to external transparency logs strengthens non-repudiation.

## Operational Guidance

- Generate one witness chain per execution session.
- Persist in the witness ledger and reference from evidence bundles.
- Expose audit APIs for chain retrieval and verification.
