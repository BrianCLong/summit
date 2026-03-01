package helm.values

import future.keywords

deny[msg] {
  r := input.resources[_]
  r.kind == "Deployment"
  not r.spec.template.spec.securityContext.runAsNonRoot
  msg := "runAsNonRoot required"
}

deny[msg] {
  r := input.resources[_]
  r.kind == "Deployment"
  ct := r.spec.template.spec.containers[_]
  not ct.resources.limits
  msg := "resource limits required"
}
