package policies.allowedregistries

import rego.v1

default allow := false

allow if {
  some container in input.review.object.spec.template.spec.containers
  startswith(container.image, "ghcr.io/BrianCLong/")
}
