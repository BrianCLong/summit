# GA Delta Backlog

**Mode:** Reasoning (judgmental synthesis from evidence).  
**Authority Anchors:** Constitution + Meta-Governance + Agent Mandates + GA guardrails.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Tools, Observability, Security.
- **Threats Considered:** tool-chain drift, gate bypass via missing scripts, evidence incompleteness, test flakiness masking defects.
- **Mitigations:** deterministic gate scripts, restore missing test harness assets, formalize CI parity checks, evidence bundle capture per PR.

## Backlog Table

| ID   | Gate                             | Symptom                                    | Root Cause Hypothesis                                                   | Proposed Fix                                                             | Evidence Needed                       | Risk   | PR Size | Owner |
| ---- | -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- | ------ | ------- | ----- |
| GA-1 | `pnpm -r test`, `make preflight` | `apps/workflow-engine` Jest setup missing  | `tests/utils/jest-setup.cjs` removed or path drifted                    | Restore file or update Jest config path                                  | Test logs + file diff                 | Medium | S       | Codex |
| GA-2 | `make ga`                        | `.venv/bin/ruff` missing                   | GA gate assumes venv without bootstrap                                  | Add venv bootstrap to GA gate or fallback to `python -m ruff/mypy`       | GA gate log + updated script evidence | Medium | M       | Codex |
| GA-3 | `pnpm ci:parity`                 | Script missing                             | Scripts removed/renamed in `package.json`                               | Restore scripts or document replacement gate in Makefile                 | Script diff + command output          | Low    | S       | Codex |
| GA-4 | Lint (preflight/ga)              | ruff import order errors + eslint warnings | Lint exceptions accumulating without governance                         | Fix imports + remove no-redeclare warnings or record governed exceptions | Lint output + clean run               | Medium | M       | Codex |
| GA-5 | `make ga-verify`                 | Tier B verification map missing item       | `Media Authenticity & Provenance` not listed in `verification-map.json` | Update verification map + MVP-4 GA verification doc                      | `make ga-verify` output + map diff    | Medium | S       | Codex |

## Evidence Requirements (Per Item)

- Commands captured in `evidence/ga-recapture/`.
- Each fix must add a new evidence bundle under `evidence/pr-<N>-<slug>/`.

**End State:** Backlog ordered and bounded; execution is intentionally constrained to atomic PRs.
