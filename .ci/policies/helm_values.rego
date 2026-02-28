package helm.values

import future.keywords

deny[msg] {
  input.resources[_].kind == "Deployment"
  not input.resources[_].spec.template.spec.securityContext.runAsNonRoot
  msg := "runAsNonRoot required"
}

deny[msg] {
  input.resources[_].kind == "Deployment"
  not input.resources[_].spec.template.spec.containers[_].resources.limits
  msg := "resource limits required"
}
