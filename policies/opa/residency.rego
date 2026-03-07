package composer.residency

import rego.v1

# Input contract (example):
# input = {
#   "mode": "enforce" | "shadow",
#   "artifact": {"region": "us-east-1", "digest": "sha256:…"},
#   "tenant": {"id": "acme", "allowed_regions": ["us-east-1","us-west-2"]}
# }

default allow := true

violation contains msg if {
  not input.artifact.region in input.tenant.allowed_regions
  msg := {
    "code": "RESIDENCY_VIOLATION",
    "region": input.artifact.region,
    "allowed": input.tenant.allowed_regions,
    "artifact": input.artifact.digest,
  }
}

allow if {
  count(violation) == 0
}

decision := {
  "policy": "residency",
  "mode": input.mode,
  "allow": allow,
  "violations": violation,
}
