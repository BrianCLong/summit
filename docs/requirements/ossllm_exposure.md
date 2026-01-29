# OSS LLM Internet Exposure: Requirements & Tests

## Scope

This document defines the deny-by-default controls, evidence IDs, and test fixtures for
internet-exposed, self-hosted open-weight LLM deployments (e.g., Ollama bound to a public
interface without guardrails).

## Source Signals (Public Research Summary)

- Large volumes of internet-reachable open-weight LLM deployments were observed, with a
  subset configured without guardrails or with prompts that enable harmful use.
- Risk categories include: public exposure without auth, tool-enabled misuse/exfiltration,
  prompt/guardrail tampering, identity laundering via proxying, and monoculture systemic risk.

## Threat → Mitigation → Gate → Tests

| Threat                    | Mitigation                                      | Gate                    | Deny-by-default tests                                           |
| ------------------------- | ----------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Public endpoint hijack    | Require authentication + default localhost bind | `gate.net.exposure`     | Fail fixture: `0.0.0.0` + `auth_enabled=false`                  |
| Tool-enabled exfil/action | Tool allowlist + signed policy                  | `gate.tools.agency`     | Fail fixture: tools enabled + empty allowlist + unsigned policy |
| Prompt/guardrail tamper   | Signed prompt hash + config attestation         | `gate.integrity.prompt` | Fail fixture: prompt hash mismatch vs expected                  |
| Proxy/identity laundering | Rate limits + abuse heuristics                  | `gate.abuse.ratelimit`  | Fail fixture: high QPS burst detection                          |
| Monoculture systemic risk | Fleet diversity report                          | `gate.risk.monoculture` | Warning-only report for low diversity                           |

## Evidence IDs

All findings emitted by gates must use the following prefixes:

- `EVD-OSSLLM-MISUSE-NET-` (network exposure)
- `EVD-OSSLLM-MISUSE-TOOLS-` (tool agency)
- `EVD-OSSLLM-MISUSE-PROMPT-` (prompt integrity)
- `EVD-OSSLLM-MISUSE-ABUSE-` (abuse heuristics)
- `EVD-OSSLLM-MISUSE-RISK-` (systemic risk)

## Fixtures (Minimum Set)

### Negative (deny-by-default)

- `tests/fixtures/exposure/public_bind_no_auth.yaml`
- `tests/fixtures/tools/tools_enabled_no_policy.yaml`
- `tests/fixtures/prompt/prompt_hash_mismatch.yaml`

### Positive (allow)

- `tests/fixtures/exposure/localhost_with_auth.yaml`
- `tests/fixtures/tools/tools_enabled_allowlist_signed.yaml`
- `tests/fixtures/prompt/prompt_hash_match.yaml`

## Evidence Bundle Requirements

Each run must emit the evidence bundle files listed below, validated against JSON schemas:

- `evidence/report.json`
- `evidence/metrics.json`
- `evidence/stamp.json`
- `evidence/index.json`

## Determinism Requirements

- Only `evidence/stamp.json` may contain timestamps.
- All other evidence artifacts must be deterministic and stable across runs.

## Rollout Guidance

- Start in `audit` mode for one release, then enforce failures for high-severity findings.
- Feature flags for innovation-lane gates remain `OFF` by default.
