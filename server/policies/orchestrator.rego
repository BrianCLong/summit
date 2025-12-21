# Orchestrator policy gate for WRITE and DEPLOY actions
# Enforces justification requirements and basic change-management controls.

package orchestrator.policy

default allow := false

# Version is surfaced in evaluation logs and audit events
policy_version := "v1.0.0"

# Collect denial reasons for observability
deny["reason_for_access_required"] {
  input.action.type == "WRITE"
  not input.action.reason_for_access
}

deny["reason_for_access_required"] {
  input.action.type == "DEPLOY"
  not input.action.reason_for_access
}

deny["change_window_required"] {
  input.action.type == "DEPLOY"
  input.environment.stage == "production"
  not input.environment.change_request_id
}

deny["unsafe_parameters"] {
  input.action.type == "WRITE"
  input.action.parameters.risk == "high"
  not input.action.parameters.safety_review
}

# Allow WRITE when justification is present and no denials triggered
allow {
  input.action.type == "WRITE"
  input.action.reason_for_access
  not deny[_]
}

# Allow DEPLOY when justification and change controls are satisfied
allow {
  input.action.type == "DEPLOY"
  input.action.reason_for_access
  input.environment.stage != "production"
  not deny[_]
}

allow {
  input.action.type == "DEPLOY"
  input.action.reason_for_access
  input.environment.stage == "production"
  input.environment.change_request_id
  not deny[_]
}

reason[msg] {
  msg := deny[_]
}

reason[msg] {
  not deny[_]
  msg := "allow"
}

decision := {
  "allow": allow,
  "reason": reason,
  "policy_version": policy_version,
  "deny": deny,
}
