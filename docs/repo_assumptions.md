# Repo Assumptions Validation

## Structure Mapping

| Plan Element | Assumed Path | Actual Repo Path | Status |
| :--- | :--- | :--- | :--- |
| Agent Patterns | `agents/patterns/` | `summit/agents/patterns/` | Created |
| Governance Policy | `policy/opa/` | `policy/opa/` | Exists |
| Rollback Logic | `orchestration/rollback.py` | `summit/orchestration/rollback.py` | Created |
| Observability | `observability/metrics.py` | `summit/obs/metrics.py` | Created |
| Data Sentries | `agents/sentries/` | `summit/agents/sentries/` | Created |
| Offline Orch | `orchestration/queue.py` | `summit/orchestration/queue.py` | Created |
| Cloud Connectors | `connectors/cloud/` | `connectors/cloud/` | Created |

## Notes
- `summit/` is the main Python package.
- Root `agents/` contains definitions/manifests, not the Python patterns.
- Root `policy/` contains OPA policies.
- Root `connectors/` contains connector implementations.
- Root `docs/` is the documentation home.

