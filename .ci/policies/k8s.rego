import future.keywords
package ci.kubernetes

default deny := []

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
  not input.spec.template.spec.containers[_].securityContext.runAsNonRoot
  msg := "containers_must_run_as_non_root"
}
