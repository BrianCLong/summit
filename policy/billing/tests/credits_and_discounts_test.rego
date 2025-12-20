package billing.credits_and_discounts_test

import data.billing.credits_and_discounts

credits := json.unmarshal(io.read_file("policy/billing/tests/fixtures/sample_credits.json"))

finance_manager := {"id": "fin-1", "role": "finance_manager"}

low_credit := credits[0]
high_discount := credits[1]

test_low_credit_requires_finance_manager_only {
  input := {
    "subject": finance_manager,
    "credit_memo": low_credit,
    "context": {"reason": "sla breach", "requested_at": "2025-02-10T12:00:00Z"}
  }
  decision := credits_and_discounts.decision with input as input
  decision.allowed
  decision.reason == "credit_credit_low"
  decision.required_approvals == ["finance_manager"]
}

test_high_discount_requires_cfo {
  input := {
    "subject": finance_manager,
    "credit_memo": high_discount,
    "context": {"reason": "strategic renewal", "requested_at": "2025-02-10T12:00:00Z"}
  }
  decision := credits_and_discounts.decision with input as input
  decision.allowed
  decision.reason == "credit_discount_high"
  decision.required_approvals == ["finance_manager", "revops_lead", "cfo"]
  decision.flags[_] == "revenue_impact"
}
