# Agent Docs Security Controls

## Threat Table

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Prompt injection via docs | Schema-only ingestion and strict JSON validation | `agent-doc-schema-validate` | `tests/schema/test_agent_doc_schema.py` |
| Hidden side effects | `side_effects` required and policy lint enforced | `agent-doc-determinism-check` | `tests/security/test_agent_doc_policy.py` |
| Privilege escalation | `policy_constraints` required with deny-by-default semantics | `agent-doc-determinism-check` | `tests/security/test_agent_doc_policy.py` |

## Data Handling Rules

- Never embed secrets or runtime tokens in generated agent docs.
- Keep deterministic artifacts free of runtime timestamps.
- Allow timestamp material only in `stamp.json` when needed.
- Preserve evidence IDs in `report.json` for downstream audit correlation.
