# Autonomous Engineer v2 Security Controls

## Threat Mapping
| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Prompt/plan bypass | preflight schema validation | `check_plan_gate` | `tests/agent/test_plan_required.py` |
| Secret exfiltration in logs | never-log regex enforcement | `check_never_log` (planned) | `tests/security/test_redaction.py` |
| Malicious patch content | patch diff policy checks | `check_patch_policy` | `tests/security/test_patch_policy.py` |
| Unbounded tool execution | step budget with hard fail | runtime limiter | `tests/agent/test_budget_enforced.py` |
| Risky edits from hallucination | eval threshold gate | `check_eval_min_score` | `tests/eval/test_eval_threshold.py` |

## Abuse Fixtures
- `tests/fixtures/abuse/patch_inject_secret.txt`
- `tests/fixtures/abuse/destructive_command.txt`

## Enforcement Position
Deny-by-default policy applies to network commands, secret-like payloads, and destructive command patterns.
