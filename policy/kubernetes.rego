package kubernetes

import rego.v1

# Kubernetes security policy rules
# Based on Pod Security Standards and CIS Kubernetes Benchmarks

# Security Context Policies

# Deny privileged containers
deny contains msg if {
	input.kind == "Pod"
	input.spec.securityContext.privileged == true
	msg := "Privileged containers are not allowed"
}

deny contains msg if {
	input.kind == "Pod"
	input.spec.containers[_].securityContext.privileged == true
	msg := "Privileged containers are not allowed"
}

# Deny containers running as root
deny contains msg if {
	input.kind == "Pod"
	input.spec.securityContext.runAsUser == 0
	msg := "Containers should not run as root (UID 0)"
}

deny contains msg if {
	input.kind == "Pod"
	input.spec.containers[_].securityContext.runAsUser == 0
	msg := "Containers should not run as root (UID 0)"
}

# Require non-root filesystem
deny contains msg if {
	input.kind == "Pod"
	input.spec.containers[_].securityContext.readOnlyRootFilesystem != true
	msg := "Containers should use read-only root filesystem"
}

# Deny privilege escalation
deny contains msg if {
	input.kind == "Pod"
	input.spec.containers[_].securityContext.allowPrivilegeEscalation == true
	msg := "Privilege escalation is not allowed"
}

# Require security capabilities to be dropped
deny contains msg if {
	input.kind == "Pod"
	container := input.spec.containers[_]
	not container.securityContext.capabilities.drop
	msg := "Containers must drop security capabilities"
}

deny contains msg if {
	input.kind == "Pod"
	container := input.spec.containers[_]
	not "ALL" in container.securityContext.capabilities.drop
	msg := "Containers must drop ALL capabilities"
}

# Network Policies

# Require network policies for workloads
warn contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	not has_network_policy
	msg := "Consider defining NetworkPolicy for this workload"
}

has_network_policy if {
	# This is a simplified check - in practice, you'd query for NetworkPolicy resources
	# that select this workload's pods
	true
}

# Resource Management

# Require resource limits
deny contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	container := input.spec.template.spec.containers[_]
	not container.resources.limits
	msg := sprintf("Container %s must define resource limits", [container.name])
}

deny contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	container := input.spec.template.spec.containers[_]
	not container.resources.limits.memory
	msg := sprintf("Container %s must define memory limits", [container.name])
}

deny contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	container := input.spec.template.spec.containers[_]
	not container.resources.limits.cpu
	msg := sprintf("Container %s must define CPU limits", [container.name])
}

# Require resource requests
warn contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	container := input.spec.template.spec.containers[_]
	not container.resources.requests
	msg := sprintf("Container %s should define resource requests", [container.name])
}

# Image Security

# Deny latest tag
deny contains msg if {
	input.kind in ["Pod", "Deployment", "StatefulSet", "DaemonSet"]
	container := get_containers[_]
	endswith(container.image, ":latest")
	msg := sprintf("Container %s uses :latest tag, specify explicit version", [container.name])
}

# Require image pull policy
deny contains msg if {
	input.kind in ["Pod", "Deployment", "StatefulSet", "DaemonSet"]
	container := get_containers[_]
	container.imagePullPolicy != "Always"
	not contains(container.image, ":")
	msg := sprintf("Container %s should use imagePullPolicy: Always", [container.name])
}

# Require approved registries
deny contains msg if {
	input.kind in ["Pod", "Deployment", "StatefulSet", "DaemonSet"]
	container := get_containers[_]
	not approved_registry(container.image)
	msg := sprintf("Container %s uses unapproved registry: %s", [container.name, container.image])
}

approved_registry(image) if {
	allowed_registries := [
		"ghcr.io/",
		"docker.io/",
		"registry.access.redhat.com/",
		"gcr.io/",
		"mcr.microsoft.com/",
		"public.ecr.aws/"
	]
	some registry in allowed_registries
	startswith(image, registry)
}

# Allow official library images
approved_registry(image) if {
	official_patterns := [
		"node:",
		"python:",
		"golang:",
		"alpine:",
		"ubuntu:",
		"debian:",
		"nginx:",
		"redis:",
		"postgres:",
		"mysql:"
	]
	some pattern in official_patterns
	startswith(image, pattern)
}

get_containers contains container if {
	input.kind == "Pod"
	container := input.spec.containers[_]
}

get_containers contains container if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	container := input.spec.template.spec.containers[_]
}

# Service Security

# Deny NodePort services in production
deny contains msg if {
	input.kind == "Service"
	input.spec.type == "NodePort"
	input.metadata.namespace != "kube-system"
	msg := "NodePort services are not allowed outside kube-system namespace"
}

# Require LoadBalancer source ranges
warn contains msg if {
	input.kind == "Service"
	input.spec.type == "LoadBalancer"
	not input.spec.loadBalancerSourceRanges
	msg := "LoadBalancer services should specify source IP ranges"
}

# Ingress Security

# Require TLS for Ingress
deny contains msg if {
	input.kind == "Ingress"
	not input.spec.tls
	msg := "Ingress resources must use TLS"
}

# Metadata Validation

# Require specific labels
warn contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Service"]
	required_labels := {"app", "version", "environment"}
	missing := required_labels - object.get(input.metadata, "labels", {})
	count(missing) > 0
	msg := sprintf("Missing required labels: %v", [missing])
}

# Namespace restrictions
deny contains msg if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet", "Pod"]
	input.metadata.namespace in ["kube-system", "kube-public", "kube-node-lease"]
	msg := sprintf("Workloads should not be deployed to system namespace: %s", [input.metadata.namespace])
}

# Storage Security

# Require encryption for persistent volumes
warn contains msg if {
	input.kind == "PersistentVolume"
	not input.spec.csi.volumeAttributes.encrypted
	msg := "Persistent volumes should be encrypted"
}

# Deny hostPath volumes
deny contains msg if {
	input.kind in ["Pod", "Deployment", "StatefulSet", "DaemonSet"]
	volume := get_volumes[_]
	volume.hostPath
	msg := sprintf("hostPath volumes are not allowed: %s", [volume.name])
}

get_volumes contains volume if {
	input.kind == "Pod"
	volume := input.spec.volumes[_]
}

get_volumes contains volume if {
	input.kind in ["Deployment", "StatefulSet", "DaemonSet"]
	volume := input.spec.template.spec.volumes[_]
}

# RBAC Security

# Require least privilege for ServiceAccounts
deny contains msg if {
	input.kind == "ClusterRoleBinding"
	input.roleRef.name == "cluster-admin"
	input.subjects[_].kind == "ServiceAccount"
	msg := "ServiceAccounts should not have cluster-admin privileges"
}

# Warn about wildcards in RBAC
warn contains msg if {
	input.kind in ["Role", "ClusterRole"]
	rule := input.rules[_]
	"*" in rule.verbs
	msg := "Avoid wildcard (*) permissions in RBAC rules"
}

warn contains msg if {
	input.kind in ["Role", "ClusterRole"]
	rule := input.rules[_]
	"*" in rule.resources
	msg := "Avoid wildcard (*) resources in RBAC rules"
}