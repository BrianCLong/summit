import future.keywords
package kubernetes.admission

import rego.v1

# Deny containers without resource limits
deny contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  not container.resources.limits
  msg := sprintf("Container '%s' must have resource limits", [container.name])
}

# Deny containers running as root
deny contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  container.securityContext.runAsUser == 0
  msg := sprintf("Container '%s' cannot run as root user", [container.name])
}

# Require security context for conductor services
deny contains msg if {
  input.kind == "Deployment"
  conductor_services := {"conductor-server", "conductor-opa", "conductor-mcp"}
  conductor_services[input.metadata.name]
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  not container.securityContext
  msg := sprintf("Conductor service '%s' must have securityContext", [container.name])
}

# Deny privileged containers
deny contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  container.securityContext.privileged == true
  msg := sprintf("Container '%s' cannot run in privileged mode", [container.name])
}

# Require non-root filesystem for conductor services
deny contains msg if {
  input.kind == "Deployment"
  conductor_services := {"conductor-server", "conductor-opa"}
  conductor_services[input.metadata.name]
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  not container.securityContext.readOnlyRootFilesystem == true
  msg := sprintf("Conductor service '%s' should use read-only root filesystem", [container.name])
}

# Require network policies for conductor namespace
warn contains msg if {
  input.kind == "Namespace"
  input.metadata.name == "conductor"
  not input.metadata.annotations["networking.k8s.io/network-policy"]
  msg := "Conductor namespace should have network policy annotations"
}

# Validate service account configuration
warn contains msg if {
  input.kind == "Deployment"
  input.metadata.namespace == "conductor"
  not input.spec.template.spec.serviceAccountName
  msg := sprintf("Conductor deployment '%s' should specify serviceAccountName", [input.metadata.name])
}

# Require pod security standards
deny contains msg if {
  input.kind == "Namespace"
  input.metadata.name == "conductor"
  not input.metadata.labels["pod-security.kubernetes.io/enforce"]
  msg := "Conductor namespace must enforce pod security standards"
}

# Validate secret management
warn contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  container.env[j].valueFrom.secretKeyRef
  secret_name := container.env[j].valueFrom.secretKeyRef.name
  not startswith(secret_name, "conductor-")
  msg := sprintf("Container '%s' should use conductor-prefixed secrets", [container.name])
}

# Require liveness and readiness probes
warn contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  not container.livenessProbe
  msg := sprintf("Container '%s' should have liveness probe", [container.name])
}

warn contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  not container.readinessProbe
  msg := sprintf("Container '%s' should have readiness probe", [container.name])
}

# Require signed and attested images for deployments
deny contains msg if {
  input.kind == "Deployment"
  not input.spec.template.metadata.annotations["supplychain.summit.dev/signed"] == "true"
  msg := "Deployment must declare supplychain.summit.dev/signed=true"
}

deny contains msg if {
  input.kind == "Deployment"
  not input.spec.template.metadata.annotations["supplychain.summit.dev/attested"] == "true"
  msg := "Deployment must declare supplychain.summit.dev/attested=true"
}

# Validate image pull policy
warn contains msg if {
  input.kind == "Deployment"
  input.spec.template.spec.containers[i]
  container := input.spec.template.spec.containers[i]
  container.imagePullPolicy != "Always"
  contains(container.image, ":latest")
  msg := sprintf("Container '%s' with :latest tag should use imagePullPolicy: Always", [container.name])
}

# Require resource quotas for conductor namespace
warn contains msg if {
  input.kind == "Namespace"
  input.metadata.name == "conductor"
  not input.metadata.annotations["quota.kubernetes.io/cpu"]
  msg := "Conductor namespace should have CPU quota annotations"
}

# Validate ingress security
deny contains msg if {
  input.kind == "Ingress"
  input.metadata.namespace == "conductor"
  not input.metadata.annotations["kubernetes.io/ingress.class"]
  msg := "Conductor ingress must specify ingress class"
}

deny contains msg if {
  input.kind == "Ingress"
  input.metadata.namespace == "conductor"
  not input.spec.tls
  msg := "Conductor ingress must use TLS"
}

# Require pod disruption budgets for conductor services
warn contains msg if {
  input.kind == "Deployment"
  input.metadata.namespace == "conductor"
  critical_services := {"conductor-server", "conductor-opa"}
  critical_services[input.metadata.name]
  msg := sprintf("Critical service '%s' should have PodDisruptionBudget", [input.metadata.name])
}

# Validate horizontal pod autoscaler
warn contains msg if {
  input.kind == "Deployment"
  input.metadata.namespace == "conductor"
  scalable_services := {"conductor-server"}
  scalable_services[input.metadata.name]
  msg := sprintf("Scalable service '%s' should have HorizontalPodAutoscaler", [input.metadata.name])
}
