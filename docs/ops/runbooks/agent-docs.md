# Agent Docs Runbook

## Scope

Operational procedure for generating, validating, and rolling back machine-readable agent docs.

## Regenerate Artifacts

```bash
AGENT_DOCS_ENABLED=true AGENT_DOCS_TIMESTAMP=1970-01-01T00:00:00Z python3 scripts/generate_agent_docs.py --output-dir spec/agents
```

## Validate Drift and Policy

```bash
AGENT_DOCS_ENABLED=true AGENT_DOCS_TIMESTAMP=1970-01-01T00:00:00Z python3 scripts/generate_agent_docs.py --check --output-dir spec/agents
python3 scripts/policy/agent_doc_policy_check.py --input-dir spec/agents
python3 scripts/monitoring/agent-doc-drift.py --output drift-report.json
```

## Rollback

1. Revert changed files under `spec/agents/` and `schemas/agent-doc.schema.json`.
2. Re-run the validation commands to confirm drift and policy gates return clean.
3. Keep `AGENT_DOCS_ENABLED=false` until replacement artifacts are reviewed.
