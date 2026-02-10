package composer.policy_shadow

import future.keywords

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
} else = result {
  input.mode == "enforce"
  decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
  # Simplified all check without function
  allow_all := count([d | some d in decisions; not d.allow]) == 0
  result := {
      "mode": input.mode,
      "allow": allow_all,
      "decisions": decisions
  }
}
