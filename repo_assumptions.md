# Repo Assumptions & Validation

## Verified vs Assumed

| Area | Verified | Assumed | Notes |
| --- | --- | --- | --- |
| Python CLI layout | ✅ | ⛔ | `summit/cli/` exists with argparse entrypoints (e.g., `automation_verify.py`). |
| Agents module | ✅ | ⛔ | `summit/agents/` exists with `cli.py` argparse pattern. |
| Test runner | ✅ | ⛔ | `pytest.ini` defines `testpaths=tests`. |
| Packaging scope | ✅ | ⛔ | `pyproject.toml` only packages `maestro*` and `api*`; new `summit/` modules are runtime-only. |
| Docs structure | ✅ | ⛔ | `docs/standards/`, `docs/security/data-handling/`, and `docs/ops/runbooks/` exist. |
| Monitoring scripts | ✅ | ⛔ | `scripts/monitoring/` has drift detectors; new drift script should live there. |
| FS-Researcher module paths | ⛔ | ✅ | Targeting `summit/agents/fs_researcher/` and `summit/cli/fs_research.py` based on current layout. |
| Evidence/artifacts schema | ⛔ | ✅ | No dedicated schema found; new `artifacts/*.json` will follow existing deterministic JSON pattern. |

## Must-Not-Touch List

- `pnpm-lock.yaml`
- `package-lock.json` (if present)
- `Cargo.lock`
- `node_modules/`
- `dist/`, `build/`, or generated artifacts
- `secrets/`, `.env`, or credential material
- `docs/governance/` policy files (unless explicitly scoped)

## Validation Notes

- FS-Researcher CLI should follow the argparse pattern used in `summit/agents/cli.py` and `summit/skillforge/cli.py`.
- Deterministic JSON outputs align with `summit/cli/automation_verify.py` expectations for evidence artifacts.
