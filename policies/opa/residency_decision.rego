package composer.decision

import data.composer.residency as r

decision := {
  "policy": "residency",
  "mode": mode,
  "allow": allow_val,
  "violations": r.violation,
}
{
  mode := input.mode
  allow_val := r.allow
}
