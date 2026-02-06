package policies.allowedregistries

default allow := false
allow if {
  some img
  img := input.review.object.spec.template.spec.containers[_].image
  startswith(img, "ghcr.io/BrianCLong/")
}
