package sensitive.access

import future.keywords.if

valid_input := {
  "tenantId": "tenant-1",
  "userId": "user-1",
  "role": "analyst",
  "action": "get",
  "resource": "/api/security/pii/scan",
  "context": {
    "purpose": "investigation",
    "justification": "Fraud case review",
    "case_id": "CASE-123",
  },
}

# Missing purpose should be denied

test_missing_purpose_denied if {
  not allow with input as valid_input with input.context.purpose as ""
  reason == "context_missing"
}

# Missing justification should be denied

test_missing_justification_denied if {
  not allow with input as valid_input with input.context.justification as ""
  reason == "context_missing"
}

# Missing case_id should be denied

test_missing_case_id_denied if {
  not allow with input as valid_input with input.context.case_id as ""
  reason == "context_missing"
}

# Valid triple allows access

test_valid_context_allows if {
  allow with input as valid_input
  reason == "allowed" with input as valid_input
}
