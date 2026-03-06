package composer.decision

import data.composer.residency as r

decision = {
  "policy": "residency",
  "mode": input.mode,
  "allow": r.allow,
  "violations": r.violation,
}
