package composer.policy_shadow

# Combine sub-decisions and emit a consolidated verdict

verdict := {
  "mode": input.mode,
  "allow": allow_all,
  "decisions": [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision],
}
{
  # In shadow mode, we never block — but we keep per-policy decisions
  input.mode == "shadow"
  allow_all = true
}

verdict = v {
  input.mode == "enforce"
  import future.keywords.in
  decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
  allow_all_val := all(decisions, func(x){ x.allow })
  v := {
    "mode": input.mode,
    "allow": allow_all_val,
    "decisions": decisions,
  }
}

# Helper: all()
all(arr, fn) = ok {
  ok := true
  some i
  ok = ok & fn(arr[i])
}

