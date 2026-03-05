# Data Handling: Autonomous Engineer V2

## Threat Mitigations
- Prompt/plan bypass: Plan gate hard-fails (`check_plan_gate`)
- Secret exfil via logs: never-log list + redaction (`check_never_log`)
- Malicious patch: policy lint on diff (`check_patch_policy`)
- Unbounded tool execution: step budget + wall-time budget
- Model hallucination: "two-pass verify" + eval threshold (`check_eval_min_score`)
