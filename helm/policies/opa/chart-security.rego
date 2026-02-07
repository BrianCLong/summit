import future.keywords
package chart.security

default allow = true

has_required_labels(resource) {
  resource.metadata.labels["app.kubernetes.io/name"]
  resource.metadata.labels["app.kubernetes.io/instance"]
}

has_resources_defined(container) {
  container.resources
  container.resources.requests
  container.resources.limits
}

violation["missing required labels"] {
  resource := input[_]
  resource.kind != "" // ensure object
  not has_required_labels(resource)
}

violation[msg] {
  resource := input[_]
  resource.kind == "Deployment"
  some c
  container := resource.spec.template.spec.containers[c]
  not has_resources_defined(container)
  msg := sprintf("%s/%s is missing resource limits", [resource.kind, resource.metadata.name])
}

violation[msg] {
  resource := input[_]
  resource.kind == "Pod"
  container := resource.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("%s/%s containers must run as non-root", [resource.kind, resource.metadata.name])
}

violation[msg] {
  resource := input[_]
  resource.kind == "Deployment"
  container := resource.spec.template.spec.containers[_]
  not container.securityContext.readOnlyRootFilesystem
  msg := sprintf("%s/%s containers must use read-only root filesystem", [resource.kind, resource.metadata.name])
}

allow {
  count(violation) == 0
}
