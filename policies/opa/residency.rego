package composer.residency
import future.keywords

# Input contract (example):
# input = {
#   "mode": "enforce" | "shadow",
#   "artifact": {"region": "us-east-1", "digest": "sha256:…"},
#   "tenant": {"id": "acme", "allowed_regions": ["us-east-1","us-west-2"]}
# }

default allow := true

violation[msg] {
  not input.artifact.region in input.tenant.allowed_regions
  msg := {
    "code": "RESIDENCY_VIOLATION",
    "region": input.artifact.region,
    "allowed": input.tenant.allowed_regions,
    "artifact": input.artifact.digest,
  }
}

allow {
  count(violation) == 0
}

# Top-level decision with shadow support
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

