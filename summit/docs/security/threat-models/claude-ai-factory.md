# AI Factory Threat Models

| Threat | Mitigation | CI/runtime gate |
| :--- | :--- | :--- |
| Prompt injection via issue text | Treat issue text as untrusted; strip unsafe instructions; use schema-validated planning. | Planner JSON schema gate |
| Unauthorized path mutation | Path ownership map + deny-by-default reviewer. | Architecture-review gate |
| Secret exfiltration | Never-log rules + secret scanners. | Policy-review + scan gate |
| PR sprawl / repo-wide churn | Hard fanout cap + LOC/file caps. | Merge-readiness gate |
| License contamination | Link-only or clean-room implementation. | Provenance gate |
| Self-heal loop runaway | Max 1 retry per check class; no recursive retries. | Self-heal controller gate |
| False-positive heals | Only allow known-safe remediations. | Allowlist gate |
| Branch-protection bypass | Require GitHub-enforced checks aligned to policy. | Governance reconciliation gate |
