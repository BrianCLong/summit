package composer.policy_shadow
import rego.v1

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
  allow_all if {
    count([d | d := decisions[_]; d.allow == true]) == count(decisions)
}
  decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]
}

# Helper: all()
all(arr, fn) = ok {
  ok := true
  some i
  ok = ok & fn(arr[i])
}

