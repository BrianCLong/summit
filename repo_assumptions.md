# Repo Assumptions & Validation

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
|---|---|---|---|
| `summit/` | `summit/` | ✅ Exists | Core Python package. |
| `pyproject.toml` | `pyproject.toml` | ✅ Exists | Defines dependencies (OTEL, Structlog, FastAPI). |
| `summit/observability.py` | `summit/observability.py` | ✅ Exists | Existing OTEL/Prometheus setup. |
| `summit/agents/` | `summit/agents/` | ✅ Exists | Contains `ShadowAgent` (in `finance/`). |

## Component Mapping

| Planned Component | Proposed Location | Actual Location / Action |
|---|---|---|
| Observability Schema | `summit/observability/schema.py` | Create new. |
| Evidence ID Logic | `summit/observability/evidence.py` | Create new. |
| Decision Provenance | `summit/observability/provenance.py` | Create new. |
| State Snapshot | `summit/observability/state.py` | Create new. |
| Lineage Graph | `summit/observability/lineage.py` | Create new. |
| Conflict Log | `summit/observability/conflicts.py` | Create new. |
| Wrapper | `summit/observability/wrapper.py` | Create new. |
| Existing Obs Setup | `summit/observability.py` | Will integrate with or move to `summit/observability/__init__.py`. |

## Agent Interface Findings

* **Assumption**: `agent.decide(request) -> decision dict`.
* **Reality**:
    * `summit.policy.permission_broker.PermissionBroker` has `decide(request)`.
    * `summit.agents.finance.shadow_agent.ShadowAgent` has `process(inputs)`.
    * No unified `Agent` base class found in `summit/agent` or `summit/agents`.
* **Action**: The wrapper will primarily target the `decide` pattern but should be flexible (e.g., support `process` or custom method names via config).

## Observability Stack

* **Existing**: `opentelemetry`, `structlog`, `prometheus-fastapi-instrumentator`.
* **Plan**: Leverage existing OTEL stack. The new `ObservableAgent` should emit OTEL spans and structured logs compatible with the existing setup.

## Must-Not-Touch

* `summit/acp/` (Agent Control Plane internals).
* `summit/agents/cli.py` (CLI entry point).
* `summit/observability.py` (Existing setup - I should probably *import* from it or refactor it carefully, but for now I will treat it as "legacy" to integrate with, ensuring I don't break existing apps using it).

