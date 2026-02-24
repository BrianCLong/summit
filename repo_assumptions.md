# Repo Assumptions & Validation - FS-Researcher Subsumption

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
| :--- | :--- | :--- | :--- |
| `summit/` | `summit/` | ✅ Exists | Root directory for Summit core logic. |
| `summit/agents/` | `summit/agents/` | ✅ Exists | Contains agent implementations (e.g., `cli.py`, `sandbox.py`). |
| `summit/cli/` | `summit/cli/` | ✅ Exists | Contains CLI scripts. |
| `docs/` | `docs/` | ✅ Exists | Root directory for documentation. |
| `tests/` | `tests/` | ✅ Exists | Root directory for Python and JS tests. |
| `evidence/` | `evidence/` | ✅ Exists | Contains evidence artifacts and schemas. |

## Component Mapping

| Planned Component | Proposed Location | Actual Location / Action |
| :--- | :--- | :--- |
| FS-Researcher Package | `summit/agents/fs_researcher/` | Create as new Python subpackage. |
| Workspace Logic | `summit/agents/fs_researcher/workspace.py` | Implementation of persistent workspace. |
| Context Builder | `summit/agents/fs_researcher/context_builder.py` | Stage 1 agent logic. |
| Report Writer | `summit/agents/fs_researcher/report_writer.py` | Stage 2 agent logic (KB-only). |
| CLI Command | `summit/cli/fs_research.py` | Register as a new CLI entry point. |
| Standards Doc | `docs/standards/fs-researcher-2602-01566.md` | Compliance with paper standards. |
| Security Policy | `docs/security/data-handling/fs-researcher-2602-01566.md` | Data handling and prompt injection defense. |

## Verified vs Assumed

* **Verified**: `summit/` is the primary Python package.
* **Verified**: `argparse` is used in `summit/agents/cli.py`.
* **Verified**: `pytest` is configured in `pytest.ini`.
* **Verified**: `evidence/` uses `report.json`, `metrics.json`, and `stamp.json`.
* **Assumed**: No built-in high-level "browse" tool exists; will implement a stub or interface for MWS.
* **Assumed**: `pnpm test` is the primary test entry point for CI.

## Must-Not-Touch List

* `pnpm-lock.yaml` - Managed by pnpm.
* `.github/workflows/` - Core CI/CD pipelines.
* `evidence/governed_exceptions.json` - Security bypass list.
* `AGENTS.md` - Core repo instructions.
* `package.json` - Root project configuration (unless adding scripts).
