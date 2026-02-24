package composer.policy_shadow
import future.keywords.if
import future.keywords.in

import rego.v1

import future.keywords.in

# Combine sub-decisions and emit a consolidated verdict

all_decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]

verdict := {
  "mode": input.mode,
  "allow": allow_all,
  "decisions": all_decisions,
}
{
  # In shadow mode, we never block — but we keep per-policy decisions
  input.mode == "shadow"
  allow_all := true
} else = verdict {
  input.mode == "enforce"
  allow_all := all_allow(all_decisions)
}

# Helper: all_allow()
all_allow(decs) if {
  not any_deny(decs)
}

any_deny(decs) if {
  some d in decs
  d.allow == false
}

