package ci.kubernetes

import future.keywords

deny[msg] {
  input.kind == "Pod"
  input.spec.containers[_].securityContext.privileged == true
  msg := "privileged_containers_forbidden"
}

deny[msg] {
  input.kind == "Pod"
  input.spec.volumes[_].hostPath
  msg := "hostPath_not_allowed"
}

deny[msg] {
  input.kind == "Service"
  input.spec.type == "NodePort"
  msg := "nodeport_services_blocked"
}

deny[msg] {
  not input.metadata.labels.owner
  msg := "owner_label_required"
}

deny[msg] {
  input.kind == "Deployment"
  ct := input.spec.template.spec.containers[_]
  not ct.securityContext.runAsNonRoot
  msg := "containers_must_run_as_non_root"
}
