package composer.residency

# Input contract (example):
# input = {
#   "mode": "enforce" | "shadow",
#   "artifact": {"region": "us-east-1", "digest": "sha256:…"},
#   "tenant": {"id": "acme", "allowed_regions": ["us-east-1","us-west-2"]}
# }

import future.keywords.in

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
