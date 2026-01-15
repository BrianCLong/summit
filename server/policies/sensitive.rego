package sensitive.access

import future.keywords.if
import future.keywords.in

# Default deny

default allow = false

default reason = "context_missing"

required_fields := ["purpose", "justification", "case_id"]

missing_fields[field] if {
  field := required_fields[_]
  not input.context[field]
}

valid_purpose if {
  input.context.purpose
  input.context.purpose in [
    "investigation",
    "audit",
    "compliance",
    "fraud_ops",
    "incident_response",
  ]
}

valid_justification if {
  input.context.justification
  count(trim(input.context.justification)) > 0
}

valid_case_id if {
  input.context.case_id
  count(trim(input.context.case_id)) > 0
}

permitted_roles := {"admin", "analyst", "security_admin", "compliance_officer"}

context_complete if {
  not missing_fields[_]
}

allow = true if {
  context_complete
  valid_purpose
  valid_justification
  valid_case_id
  input.role in permitted_roles
}

reason := "context_missing" if missing_fields[_]
reason := "unsupported_purpose" if {
  context_complete
  not valid_purpose
}
reason := "insufficient_role" if {
  context_complete
  valid_purpose
  not input.role in permitted_roles
}
reason := "justification_required" if {
  context_complete
  valid_purpose
  not valid_justification
}
reason := "case_id_required" if {
  context_complete
  valid_purpose
  valid_justification
  not valid_case_id
}

reason := "allowed" if {
  allow
}

audit_log := {
  "level": "info",
  "message": "sensitive access decision",
  "metadata": {
    "purpose": input.context.purpose,
    "justification": input.context.justification,
    "case_id": input.context.case_id,
    "role": input.role,
    "resource": input.resource,
    "action": input.action,
    "decision": allow,
    "reason": reason,
  },
}
