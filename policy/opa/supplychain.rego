import future.keywords.in
import future.keywords.if
package supplychain

import rego.v1

default allow := false

# Input: the verified attestation payload (in-toto Statement) and image metadata
# Expected shape (simplified):
# input := {
#   "subject": {"name": string, "digest": {"sha256": string}},
#   "predicateType": "https://slsa.dev/provenance/v1",
#   "predicate": {"builder": {"id": string}},
#   "image": {"ref": string, "tag": string}
# }

# Disallow mutable tags like :latest
deny contains msg if {
  lower(input.image.tag) == "latest"
  msg := "image tag :latest is disallowed"
}

# Require SLSA provenance predicate
deny contains msg if {
  input.predicateType != "https://slsa.dev/provenance/v1"
  msg := "missing SLSA provenance v1 predicate"
}

# Require builder to match our expected CI workflow identity
deny contains msg if {
  not startswith(input.predicate.builder.id, "https://github.com/")
  msg := "builder identity missing or not GitHub Actions"
}

# Require subject digest to be present
deny contains msg if {
  not input.subject.digest.sha256
  msg := "provenance missing subject digest"
}

allow if {
  count(deny) == 0
}
