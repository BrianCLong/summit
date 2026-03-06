import future.keywords.in
import future.keywords.if
package composer.policy_shadow

# Combine sub-decisions and emit a consolidated verdict

verdict := {
  "mode": input.mode,
  "allow": allow_all,
  "decisions": decisions,
} if {
  # In shadow mode, we never block — but we keep per-policy decisions
  input.mode == "shadow"
  allow_all := true
  decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
} else := v if {
  input.mode == "enforce"
  decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
  allow_all := all(decisions)
  v := {
    "mode": input.mode,
    "allow": allow_all,
    "decisions": decisions,
  }
}

# Helper: all()
all(arr) if {
  every x in arr {
    x.allow
  }
}
