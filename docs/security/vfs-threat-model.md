# VFS Threat Model

## Scope

The Virtual Filesystem (VFS) provides agent-visible file access via routed mounts. This
threat model covers the router, mount policy enforcement, and backend boundary conditions.

## MAESTRO Alignment

- **Layers**: Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered**: Path traversal, policy bypass, backend confusion, data exfiltration,
  audit log leakage
- **Mitigations**: Path normalization + traversal denial, deny-by-default policy hooks,
  explicit mount allowlists, read-only modes, never-log field policy

## Threats → Mitigations → Tests → Gates

| Threat | Mitigation | Tests | Gate/Evidence |
| --- | --- | --- | --- |
| Path traversal (`../`) | Normalize and hard-deny traversal segments | `tests/agents/vfs/router.test.ts` | `EVD-DEEPAGENTS-VFS-EVAL-001` |
| Unauthorized access outside mounts | Deny-by-default routing; no mount = error | `tests/agents/vfs/router.test.ts` | `EVD-DEEPAGENTS-VFS-EVAL-001` |
| Read-only mount writes | Mode enforcement (`ro` blocks write/edit) | `tests/agents/vfs/policy.test.ts` | `EVD-DEEPAGENTS-VFS-EVAL-001` |
| Secret exfiltration | Policy hook deny rules for sensitive paths | `tests/agents/vfs/policy.test.ts` | `EVD-DEEPAGENTS-VFS-SEC-001` |
| Audit log leakage | Never-log fields list enforced by policy | Documentation + log review | `EVD-DEEPAGENTS-VFS-SEC-001` |
| Backend confusion (misrouted mount) | Longest-prefix resolution and explicit prefix config | `tests/agents/vfs/router.test.ts` | `EVD-DEEPAGENTS-VFS-EVAL-001` |

## Never-Log Fields

- File contents
- Secrets or credentials
- Tokens or API keys
- PII or user-identifying payloads

## Risk Posture

- Default state: **deny** (no mounts, no access).
- Feature flag: `VFS_ENABLED=false` by default.
- Backend instantiation is explicit and mount-scoped only.
