package composer.policy_shadow
import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Combine sub-decisions and emit a consolidated verdict

verdict := {
  "mode": input.mode,
  "allow": allow_all,
  "decisions": [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision],
}
{
  # In shadow mode, we never block — but we keep per-policy decisions
  input.mode == "shadow"
  allow_all := true
} else = verdict {
  input.mode == "enforce"
  some dec in [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
  allow_all := all(decisions, func(x){ x.allow })
  decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
}

# Helper: all()
all(arr, fn) = ok {
  ok := true
  some i
  ok = ok & fn(arr[i])
}

