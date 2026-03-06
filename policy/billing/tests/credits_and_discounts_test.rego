package billing.credits_and_discounts_test

import data.billing.credits_and_discounts

credits := [
  {
    "id": "cred-001",
    "tenant_id": "tenant-123",
    "amount": 1500,
    "currency": "USD",
    "reason": "service outage",
    "type": "credit"
  },
  {
    "id": "cred-002",
    "tenant_id": "tenant-enterprise",
    "amount": 25000,
    "currency": "USD",
    "reason": "strategic discount",
    "type": "discount"
  }
]

finance_manager := {"id": "fin-1", "role": "finance_manager"}

low_credit := credits[0]
high_discount := credits[1]

test_low_credit_requires_finance_manager_only if {
  test_input := {
    "subject": finance_manager,
    "credit_memo": low_credit,
    "context": {"reason": "sla breach", "requested_at": "2025-02-10T12:00:00Z"}
  }
  decision := credits_and_discounts.decision with input as test_input
  decision.allowed
  decision.reason == "credit_credit_low"
  decision.required_approvals == ["finance_manager"]
}

test_high_discount_requires_cfo if {
  test_input := {
    "subject": finance_manager,
    "credit_memo": high_discount,
    "context": {"reason": "strategic renewal", "requested_at": "2025-02-10T12:00:00Z"}
  }
  decision := credits_and_discounts.decision with input as test_input
  decision.allowed
  decision.reason == "credit_discount_high"
  decision.required_approvals == ["finance_manager", "revops_lead", "cfo"]
  decision.flags[_] == "revenue_impact"
}
