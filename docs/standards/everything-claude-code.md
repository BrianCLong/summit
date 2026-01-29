# Everything Claude Code - Summit Standard

## Import/Export Matrix

| Concept | Claude Code | Summit | Notes |
|---|---|---|---|
| Plugin marketplace | `marketplace.json` | `pack.registry.json` | Claude supports distribution mechanics. |
| Plugin manifest | `.claude-plugin/plugin.json` | `pack.manifest.json` | Summit adds signatures/attestation (original). |
| Hooks | hook events + scripts | Hook rules + sandbox | Claude hook semantics inform Summit adapter. |
| Skills/Commands | markdown-driven workflows | typed workflow steps | Clean-room reimplementation; no code copying. |
| MCP servers | config JSON | `MCPProfile` + allowlist | Enforce budgets & least privilege. |
| Rules | manual install limitation | `RuleSet` as pack artifact | Addresses distribution friction. |

## Standards & Constraints

### 1. Import Constraints
*   **Metadata-first**: We import structure and references, not raw binaries or executable scripts blindly.
*   **Clean-room**: Skills are reimplemented using Summit's typed steps, not copied verbatim.
*   **Version Pinning**: All imports must pin a specific upstream commit SHA.

### 2. Policy Gates
*   **MCP Budget**: < 10 enabled MCPs per project, < 80 total tools.
*   **Hook Safety**: All hooks must pass static analysis (no network, no dangerous fs ops) or be sandboxed.
*   **Deny-by-default**: Only explicitly allowed hooks are enabled in the "Safe Profile".

### 3. Evidence
*   All pack executions must produce deterministic evidence artifacts (`report.json`, `metrics.json`, `stamp.json`).
*   Timestamps must be excluded from hashable artifacts to ensure reproducibility.

### 4. Security
*   **Secret Scanning**: All imported artifacts and pack outputs are scanned for secrets.
*   **Drift Detection**: Scheduled jobs monitor upstream for changes to ensure the pack remains consistent or is explicitly updated.
