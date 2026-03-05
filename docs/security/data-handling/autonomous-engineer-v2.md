# Autonomous Engineer v2 Threat-informed Requirements

| Threat                                 | Mitigation                               | CI/runtime gate        | Test case                             |
| -------------------------------------- | ---------------------------------------- | ---------------------- | ------------------------------------- |
| Prompt/plan bypass                     | Plan gate hard-fails                     | `check_plan_gate`      | `tests/agent/test_plan_required.py`   |
| Secret exfil via logs                  | never-log list + redaction               | `check_never_log`      | `tests/security/test_redaction.py`    |
| Malicious patch (supply-chain)         | policy lint on diff + allowlist commands | `check_patch_policy`   | `tests/security/test_patch_policy.py` |
| Unbounded tool execution               | step budget + wall-time budget           | runtime limiter        | `tests/agent/test_budget_enforced.py` |
| Model hallucination causes risky edits | “two-pass verify” + unit tests required  | `check_eval_min_score` | `tests/eval/test_eval_threshold.py`   |
