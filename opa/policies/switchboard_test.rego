package switchboard.approvals

import rego.v1

test_non_privileged_allows_execute if {
  allow with input as {
    "action": "execute_command",
    "command": {"name": "task.create", "privileged": false}
  }
}

test_privileged_requires_approval if {
  result := decision with input as {
    "action": "execute_command",
    "command": {"name": "access.request", "privileged": true}
  }
  result.outcome == "require_approval"
  count(result.required_approver_roles) == 2
}

test_approval_requires_security_role if {
  not allow with input as {
    "action": "approve",
    "approval": {"decision": "approve", "actor_roles": ["operator"]}
  }
  allow with input as {
    "action": "approve",
    "approval": {"decision": "approve", "actor_roles": ["security"]}
  }
}
