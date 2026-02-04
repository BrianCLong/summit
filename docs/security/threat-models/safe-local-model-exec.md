# Threat Model: Safe Local Model Execution

## Threats & Mitigations

| Threat | Mitigation | Gate / Test |
| --- | --- | --- |
| Model exfiltrates secrets via network | Egress deny-by-default; allowlist only | `run_policy_check.mjs` |
| Secrets mounted into sandbox | Mount scanner blocks forbidden paths (`.ssh`, etc) | `run_policy_check.mjs` |
| Privilege escalation / Host breakout | Non-root user, Read-only RootFS, Seccomp | `run.sh` + policy check |
| Supply-chain poisoned weights | SHA256 pinning + allowlist | `hash_weights.mjs` |
| Sensitive data retained in logs | Redaction hooks (placeholder); deterministic receipts | `receipt.mjs` |

## Residual Risk
- Vulnerabilities in the container runtime (Docker) itself.
- Compromised host environment allowing bypass of the runner script.
- Side-channel attacks (e.g., timing/power) not mitigated by software isolation.
