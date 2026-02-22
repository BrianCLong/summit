import future.keywords
package preview

default allow = false

max_ttl_hours := input.meta.max_ttl_hours

missing_labels := {l | l := required_labels[_]; not input.labels[l]}
required_labels := {"owner", "repo", "branch", "ttl_hours", "budget_usd"}

# deny privileged pod or hostPath
violation[msg] {
  some pod
  pod := input.pods[pod]
  pod.securityContext.privileged == true
  msg := sprintf("privileged pod %s is not allowed", [pod.name])
}

violation[msg] {
  some pod
  pod := input.pods[pod]
  pod.spec.volumes[_].hostPath
  msg := sprintf("hostPath volume on %s not allowed in preview", [pod.name])
}

violation[msg] {
  some svc
  svc := input.services[svc]
  svc.spec.type == "NodePort"
  msg := sprintf("NodePort service %s is disallowed", [svc.metadata.name])
}

violation[msg] {
  ttl := to_number(input.labels.ttl_hours)
  ttl > max_ttl_hours
  msg := sprintf("requested ttl_hours=%v exceeds max %v", [ttl, max_ttl_hours])
}

violation[msg] {
  count(missing_labels) > 0
  msg := sprintf("missing required labels: %v", [missing_labels])
}

violation[msg] {
  input.meta.quota_exceeded == true
  msg := "resource quota exceeded for preview"
}

allow {
  count(violation) == 0
}
