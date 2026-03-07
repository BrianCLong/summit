package composer.policy_shadow

import rego.v1

# Combine sub-decisions and emit a consolidated verdict

verdict := {
  "mode": input.mode,
  "allow": allow_val,
  "decisions": sub_decisions,
}

sub_decisions := [
    data.composer.residency.decision,
    data.composer.decision_dlp.decision,
    data.composer.cmk.decision
]

allow_val := true if {
    input.mode == "shadow"
} else := all_sub_decisions_allow if {
    input.mode == "enforce"
} else := false

all_sub_decisions_allow if {
    count([d | some d in sub_decisions; d.allow == true]) == count(sub_decisions)
}
