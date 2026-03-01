package preview

import future.keywords
import future.keywords.in

default allow = false

max_ttl_hours := input.meta.max_ttl_hours

missing_labels := {l | l := required_labels[_]; not input.labels[l]}
required_labels := {"owner", "repo", "branch", "ttl_hours", "budget_usd"}

# deny privileged pod or hostPath
violation[msg] {
  some p in input.pods
  p.securityContext.privileged == true
  msg := sprintf("privileged pod %s is not allowed", [p.name])
}

violation[msg] {
  some p in input.pods
  p.spec.volumes[_].hostPath
  msg := sprintf("hostPath volume on %s not allowed in preview", [p.name])
}

violation[msg] {
  some s in input.services
  s.spec.type == "NodePort"
  msg := sprintf("NodePort service %s is disallowed", [s.metadata.name])
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
