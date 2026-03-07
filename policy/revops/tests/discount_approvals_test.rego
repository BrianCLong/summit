package revops.discount_approvals_test
import future.keywords.if

import data.revops.discount_approvals
import data.revops_fixtures

# Discounts inside the role cap should be allowed with correct approvals.
test_discount_within_cap if {
  quote := revops_fixtures.quotes[0]
  test_input := {
    "quote": quote,
    "tenant": {"id": "tenant-default"},
    "subject": {"id": "user-1", "role": "sales_manager"}
  }

  decision := discount_approvals.decision with input as test_input
  decision.allowed
  decision.max_discount_allowed == 25
  decision.required_approvals == ["sales_manager"]
}

# Discounts above the role cap should surface a flag and still compute approvals.
test_discount_over_cap_flagged if {
  quote := {
    "id": "quote-1",
    "segment": "enterprise",
    "discount_percentage": 30,
    "total_value": 100000,
    "term_months": 12,
    "non_standard_terms": []
  }

  test_input := {
    "quote": quote,
    "tenant": {"id": "tenant-default"},
    "subject": {"id": "ae-1", "role": "ae"}
  }

  decision := discount_approvals.decision with input as test_input
  decision.allowed
  decision.reason == "discount_above_role_limit"
}
