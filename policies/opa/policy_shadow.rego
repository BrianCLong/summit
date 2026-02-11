package composer.policy_shadow

import future.keywords.if
import future.keywords.in

# Combine sub-decisions and emit a consolidated verdict

sub_decisions := [
    data.composer.residency.decision,
    data.composer.dlp.decision,
    data.composer.cmk.decision
]

verdict := {
  "mode": input.mode,
  "allow": allow_all,
  "decisions": sub_decisions,
} if {
  input.mode == "shadow"
  allow_all := true
} else := {
  "mode": input.mode,
  "allow": allow_all,
  "decisions": sub_decisions,
} if {
  input.mode == "enforce"
  allow_all := not any_deny
}

any_deny if {
  some dec in sub_decisions
  dec.allow == false
}

