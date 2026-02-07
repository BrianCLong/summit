# Repo Assumptions & Validation

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| `docs/standards/` | `docs/standards/` | ✅ Exists | Standard documents live here. |
| `docs/security/data-handling/` | `docs/security/data-handling/` | ✅ Exists | Data handling policies live here. |
| `docs/ops/runbooks/` | `docs/ops/runbooks/` | ✅ Exists | Operational runbooks live here. |
| `docs/roadmap/STATUS.json` | `docs/roadmap/STATUS.json` | ✅ Exists | Execution status ledger required by agent invariants. |

## Component Mapping

| Planned Component | Proposed Location | Actual Location / Action |
| --- | --- | --- |
| Playwright CLI vs MCP Standard | `docs/standards/playwright-cli-vs-mcp.md` | Create and govern the standard in docs. |
| Playwright CLI vs MCP Data Handling | `docs/security/data-handling/playwright-cli-vs-mcp.md` | Create data handling policy in security docs. |
| Playwright CLI vs MCP Runbook | `docs/ops/runbooks/playwright-cli-vs-mcp.md` | Create runbook in ops docs. |

## Constraints & Checks

- Evidence bundle validation remains mandatory for new outputs.
- Determinism gates apply to CLI evidence artifacts.
- Feature flag remains OFF by default until governance approval.

## Deferred Pending Validation

- Skill/tool execution paths for Playwright CLI implementation.
- Evidence bundle schema location and validation scripts for CLI evidence outputs.

## Next Actions

1. Publish CLI vs MCP standard, data handling, and runbook documents.
2. Update `docs/roadmap/STATUS.json` with the new documentation initiative.

