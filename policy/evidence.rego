package summit.evidence

import future.keywords.every

# Evidence is missing when status missing or no artifacts present.
deny[msg] {
  control := input.controls[_]
  control.status == "missing"
  msg := sprintf("Evidence missing for control %s", [control.controlId])
}

deny[msg] {
  control := input.controls[_]
  control.status == "stale"
  msg := sprintf("Evidence stale for control %s", [control.controlId])
}

deny[msg] {
  control := input.controls[_]
  required := control.requiredLinkTypes[_]
  not control.links[_].type == required
  msg := sprintf("Missing required link type %s for control %s", [required, control.controlId])
}

deny[msg] {
  control := input.controls[_]
  link := control.links[_]
  link.exists == false
  msg := sprintf("Broken link target %s for control %s", [link.target, control.controlId])
}

deny[msg] {
  control := input.controls[_]
  artifact := control.artifacts[_]
  artifact.exists == false
  msg := sprintf("Missing artifact %s for control %s", [artifact.path, control.controlId])
}

deny[msg] {
  control := input.controls[_]
  not control.retention.duration
  msg := sprintf("Retention policy missing for control %s", [control.controlId])
}

deny[msg] {
  control := input.controls[_]
  not control.retention.policy
  msg := sprintf("Retention policy missing for control %s", [control.controlId])
}

deny[msg] {
  control := input.controls[_]
  not control.access
  msg := sprintf("Access scope missing for control %s", [control.controlId])
}

deny[msg] {
  control := input.controls[_]
  not control.redaction.strategy
  msg := sprintf("Redaction policy missing for control %s", [control.controlId])
}
