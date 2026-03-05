package switchboard.approvals

import rego.v1

default allow = false

default required_approvals = 0

default required_approver_roles = []

default risk_level = "medium"

default decision = {
  "outcome": "deny",
  "reason": "policy_default_deny",
  "required_approver_roles": []
}

allow {
  input.action == "execute_command"
  input.command.name != ""
  not is_privileged_command
}

required_approvals = 1 {
  is_privileged_command
}

required_approver_roles = ["security", "incident_commander"] {
  is_privileged_command
}

risk_level = "high" {
  is_privileged_command
}

decision = {
  "outcome": "require_approval",
  "reason": "privileged_command_requires_approval",
  "required_approver_roles": required_approver_roles
} {
  is_privileged_command
}

is_privileged_command {
  input.action == "execute_command"
  input.command.privileged == true
}

# SECURITY: Allow approval from any required approver role (security or incident_commander)
# Previously only checked for "security" role, missing incident_commander
allow {
  input.action == "approve"
  input.approval.decision == "approve"
  some role in ["security", "incident_commander"]
  role in input.approval.actor_roles
}

allow {
  input.action == "deny"
  input.approval.decision == "deny"
}

allow {
  input.action == "access_request"
  input.request.resource_type != ""
}
