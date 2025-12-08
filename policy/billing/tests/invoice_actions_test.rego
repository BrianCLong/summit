package billing.invoice_actions_test

import data.billing.invoice_actions

invoices := json.unmarshal(io.read_file("policy/billing/tests/fixtures/sample_invoices.json"))

finance_manager := {"id": "fin-1", "role": "finance_manager"}

low_invoice := invoices[0]
high_invoice := invoices[1]

test_mark_sent_low_value_allows_no_approvals {
  input := {
    "subject": finance_manager,
    "invoice": low_invoice,
    "action": "mark_sent",
    "context": {"reason": "scheduled run", "requested_at": "2025-02-10T12:00:00Z"}
  }
  decision := invoice_actions.decision with input as input
  decision.allowed
  decision.required_approvals == []
  decision.reason == "mark_sent_low"
}

test_cancel_high_value_requires_cfo {
  input := {
    "subject": finance_manager,
    "invoice": high_invoice,
    "action": "cancel",
    "context": {"reason": "rebill with corrected usage", "requested_at": "2025-02-10T12:00:00Z"}
  }
  decision := invoice_actions.decision with input as input
  decision.allowed
  decision.reason == "cancel_high"
  decision.required_approvals == ["finance_manager", "cfo"]
  decision.flags[_] == "high_value"
}

test_manual_mark_paid_without_evidence_blocked {
  input := {
    "subject": finance_manager,
    "invoice": low_invoice,
    "action": "mark_paid",
    "context": {"reason": "manual receipt", "requested_at": "2025-02-10T12:00:00Z", "source": "manual"}
  }
  decision := invoice_actions.decision with input as input
  not decision.allowed
}
