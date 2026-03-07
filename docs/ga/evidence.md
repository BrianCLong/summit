# Qwen3-Coder-Next Evidence IDs

This document defines evidence artifacts for Qwen3-Coder-Next provider readiness and GA gating.
Evidence artifacts must conform to the schemas in `src/agents/evidence/schemas` and the templates
in `src/agents/evidence/templates`.

## Evidence IDs

| Evidence ID | Scope | Description |
| --- | --- | --- |
| EVD-QWEN3CODERNEXT-PROV-001 | Provider contract | Local LM Studio provider contract verification. |
| EVD-QWEN3CODERNEXT-LCTX-002 | Long context | Long-context pack evaluation and limits. |
| EVD-QWEN3CODERNEXT-TOOL-003 | Tool loop | Tool-call protocol stability. |
| EVD-QWEN3CODERNEXT-FAIL-004 | Failure recovery | Supervisor retry + rollback validation. |

## Artifact Layout

```
evidence/<EVIDENCE_ID>/report.json
evidence/<EVIDENCE_ID>/metrics.json
evidence/<EVIDENCE_ID>/stamp.json
evidence/index.json
```

## Timestamp Policy

Only `stamp.json` may contain timestamps. Validation scripts enforce this rule.
