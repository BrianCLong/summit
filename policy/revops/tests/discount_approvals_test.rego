package revops.discount_approvals_test

import data.revops.discount_approvals
import data.revops_fixtures

# Discounts inside the role cap should be allowed with correct approvals.
test_discount_within_cap {
  quote := revops_fixtures.quotes[0]
  input := {
    "quote": quote,
    "tenant": {"id": "tenant-default"},
    "subject": {"id": "user-1", "role": "sales_manager"}
  }

  decision := revops.discount_approvals.decision with input as input
  decision.allowed
  decision.max_discount_allowed == 25
  decision.required_approvals == ["sales_manager"]
}

# Discounts above the role cap should surface a flag and still compute approvals.
test_discount_over_cap_flagged {
  quote := {
    "id": "quote-1",
    "segment": "enterprise",
    "discount_percentage": 30,
    "total_value": 100000,
    "term_months": 12,
    "non_standard_terms": []
  }

  input := {
    "quote": quote,
    "tenant": {"id": "tenant-default"},
    "subject": {"id": "ae-1", "role": "ae"}
  }

  decision := revops.discount_approvals.decision with input as input
  decision.allowed
  decision.reason == "discount_above_role_limit"
}
