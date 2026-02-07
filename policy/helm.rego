import future.keywords
package helmsecurity

# Deny deployments without security context
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.securityContext.runAsNonRoot
    msg := sprintf("%s: containers must set runAsNonRoot=true", [input.metadata.name])
}

# Deny deployments with empty image
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.image == ""
    msg := sprintf("%s: container image must be specified", [input.metadata.name])
}

# Deny use of latest tags in production
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    endswith(container.image, ":latest")
    msg := sprintf("%s: container image must not use :latest tag", [input.metadata.name])
}

# Require resource limits
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf("%s: containers must define resource limits", [input.metadata.name])
}

# Require resource requests
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.requests
    msg := sprintf("%s: containers must define resource requests", [input.metadata.name])
}

# Deny privileged containers
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("%s: containers must not run in privileged mode", [input.metadata.name])
}

# Deny containers running as root user ID
deny contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf("%s: containers must not run as root user (UID 0)", [input.metadata.name])
}

# Require labels for tracking
deny contains msg if {
    input.Kind == "Deployment"
    not input.metadata.labels["app.kubernetes.io/name"]
    msg := sprintf("%s: missing required label app.kubernetes.io/name", [input.metadata.name])
}

deny contains msg if {
    input.Kind == "Deployment"
    not input.metadata.labels["app.kubernetes.io/version"]
    msg := sprintf("%s: missing required label app.kubernetes.io/version", [input.metadata.name])
}

# Warn about missing health checks
warn contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.livenessProbe
    msg := sprintf("%s: consider adding liveness probe for container %s", [input.metadata.name, container.name])
}

warn contains msg if {
    input.Kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.readinessProbe
    msg := sprintf("%s: consider adding readiness probe for container %s", [input.metadata.name, container.name])
}

# Warn about missing pod security context
warn contains msg if {
    input.Kind == "Deployment"
    not input.spec.template.spec.securityContext
    msg := sprintf("%s: consider setting pod-level security context", [input.metadata.name])
}

# Service-specific policies
deny contains msg if {
    input.Kind == "Service"
    input.spec.type == "LoadBalancer"
    not input.metadata.annotations["service.beta.kubernetes.io/aws-load-balancer-ssl-cert"]
    msg := sprintf("%s: LoadBalancer services should use SSL certificates", [input.metadata.name])
}

# NetworkPolicy requirements for production namespaces
warn contains msg if {
    input.Kind == "Deployment"
    input.metadata.namespace
    not startswith(input.metadata.namespace, "pr-")
    count([np | np := data.kubernetes.networkpolicies[_]; np.metadata.namespace == input.metadata.namespace]) == 0
    msg := sprintf("%s: production namespaces should have NetworkPolicy defined", [input.metadata.namespace])
}
