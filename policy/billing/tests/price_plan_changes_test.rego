package billing.price_plan_changes_test

import data.billing.price_plan_changes

pricing := json.unmarshal(io.read_file("policy/billing/tests/fixtures/summit_internal_pricing.json"))

base_subject := {"id": "user-1", "role": "finance_manager", "level": "senior"}

low_risk_after := pricing.after_small

high_risk_after := {
  "prices": {
    "cpu_hour": 0.25,
    "storage_gb": 0.40
  },
  "discounts": {
    "default": 0.15
  },
  "effective_at": "2025-02-01T00:00:00Z"
}

test_low_risk_change_allowed {
  input := {
    "subject": base_subject,
    "plan_before": pricing.before,
    "plan_after": low_risk_after,
    "tenant": {"id": "tenant-123"},
    "context": {"reason": "tier alignment", "requested_at": "2025-01-15T12:00:00Z"}
  }
  decision := price_plan_changes.decision with input as input
  decision.allowed
  decision.reason == "change_risk_low"
  decision.required_approvals == []
}

test_high_risk_change_requires_cfo {
  input := {
    "subject": base_subject,
    "plan_before": pricing.before,
    "plan_after": high_risk_after,
    "tenant": {"id": "tenant-123"},
    "context": {"reason": "strategic price change", "requested_at": "2025-01-15T12:00:00Z"}
  }
  decision := price_plan_changes.decision with input as input
  decision.allowed
  decision.reason == "change_risk_high"
  decision.required_approvals == ["finance_manager", "cfo"]
  decision.flags[_] == "high_revenue_impact"
}

test_floor_price_violation_blocked {
  input := {
    "subject": base_subject,
    "plan_before": pricing.before,
    "plan_after": pricing.after_risky,
    "tenant": {"id": "tenant-123"},
    "context": {"reason": "aggressive discount", "requested_at": "2025-01-15T12:00:00Z"}
  }
  decision := price_plan_changes.decision with input as input
  not decision.allowed
}
