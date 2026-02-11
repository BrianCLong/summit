package policies.allowedregistries
import future.keywords.if
import future.keywords.in

default allow = false

allow {
  some img
  img := input.review.object.spec.template.spec.containers[_].image
  startswith(img, "ghcr.io/BrianCLong/")
}
