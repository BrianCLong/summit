package policies.allowedregistries

import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow = false

allow {
  some img
  img := input.review.object.spec.template.spec.containers[_].image
  startswith(img, "ghcr.io/BrianCLong/")
}
