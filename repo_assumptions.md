# Repo Assumptions & Validation

## Sensing Mode (Evidence-First)

> This section records verified observations before any planning decisions.

## Verified Structure & Tooling

| Plan Item | Verified Evidence | Status | Notes |
| --- | --- | --- | --- |
| Repo root | `/workspace/summit` | ✅ Verified | Monorepo root with extensive top-level modules. |
| Node/TypeScript tooling | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | ✅ Verified | pnpm workspace present; TypeScript config files in root. |
| Python tooling | `pyproject.toml`, `pytest.ini`, `ruff.toml` | ✅ Verified | Python utilities and tests are present. |
| Rust tooling | `Cargo.toml`, `Cargo.lock` | ✅ Verified | Rust workspace present. |
| Docs tree | `docs/` | ✅ Verified | Governance, security, and ops documentation present. |
| Scripts tree | `scripts/` | ✅ Verified | CI and utility scripts directory exists. |
| Evidence store | `evidence/` | ✅ Verified | Evidence structure documented in `evidence/README.md`. |
| CI workflows | `.github/workflows/` | ✅ Verified | Extensive GitHub Actions workflows, including PR quality gate. |

## Verified Evidence & Governance References

| Requirement | Verified Source | Status | Notes |
| --- | --- | --- | --- |
| Evidence ID policy | `docs/governance/EVIDENCE_ID_POLICY.yml` | ✅ Verified | Policy file referenced by governance docs. |
| Evidence storage convention | `evidence/README.md` | ✅ Verified | Specifies `evidence/<EVIDENCE_ID>/` layout. |
| CI required checks | `.github/workflows/pr-quality-gate.yml` | ✅ Verified | Declared as the standard quality gate workflow. |
| GA guardrails | `docs/ga/` | ✅ Verified | GA guidance exists; follow guardrails for new agent work. |

## CI Gate Reality Check (Verified)

- GitHub Actions is the CI platform (`.github/workflows/`).
- `pr-quality-gate.yml` is the declared standard for PR validation.
- Additional governance and evidence workflows exist (e.g., evidence, governance, supply chain).

## Repo Reality Assertions (Updated)

- **Runtime mix**: Node/TypeScript + Python + Rust are all present and active. (Verified)
- **Evidence system**: Dedicated `evidence/` tree with documented layout. (Verified)
- **Governance**: Extensive governance docs and gate workflows exist. (Verified)

## Deferred Pending Validation

- **Primary CLI entrypoint**: Identify canonical CLI (`summitctl` or other) for adding new commands.
- **Existing graph/retrieval modules**: Locate any existing graph or retrieval subsystems to avoid duplication.
- **Redaction utilities**: Confirm any central redaction/log-safety library to reuse.

## Must-Not-Touch (Governed Exceptions Only)

- `.github/workflows/*` (add-only unless explicitly authorized)
- `LICENSE*`, `NOTICE*`
- `SECURITY.md` / `SECURITY/` (owner review required)

## Immediate Next Step (Repo-Scoped)

- Update execution status in `docs/roadmap/STATUS.json` to log the repo-assumptions validation work.
