package composer.policy_shadow

# Combine sub-decisions and emit a consolidated verdict

decisions = [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]

any_deny {
  dec := decisions[_]
  dec.allow == false
}

verdict := {
  "mode": mode,
  "allow": allow_val,
  "decisions": decisions,
} {
  mode := input.mode
  allow_val := is_allowed(mode)
}

is_allowed("shadow") = true
is_allowed("enforce") = true {
  not any_deny
}
else = false
