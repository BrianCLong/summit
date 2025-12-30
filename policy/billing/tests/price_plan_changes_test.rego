package billing.price_plan_changes_test

import data.billing.price_plan_changes

pricing := {
  "before": {
    "prices": {
      "cpu_hour": 0.12,
      "storage_gb": 0.20
    },
    "discounts": {
      "default": 0.05
    },
    "effective_at": "2025-01-01T00:00:00Z"
  },
  "after_small": {
    "prices": {
      "cpu_hour": 0.13,
      "storage_gb": 0.21
    },
    "discounts": {
      "default": 0.06
    },
    "effective_at": "2025-02-01T00:00:00Z"
  },
  "after_risky": {
    "prices": {
      "cpu_hour": 0.06,
      "storage_gb": 0.18,
      "ai_pack": 0.90
    },
    "discounts": {
      "default": 0.15
    },
    "effective_at": "2025-02-01T00:00:00Z"
  }
}

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

test_low_risk_change_allowed if {
  test_input := {
    "subject": base_subject,
    "plan_before": pricing.before,
    "plan_after": low_risk_after,
    "tenant": {"id": "tenant-123"},
    "context": {"reason": "tier alignment", "requested_at": "2025-01-15T12:00:00Z"}
  }
  decision := price_plan_changes.decision with input as test_input
  decision.allowed
  decision.reason == "change_risk_low"
  decision.required_approvals == []
}

test_high_risk_change_requires_cfo if {
  test_input := {
    "subject": base_subject,
    "plan_before": pricing.before,
    "plan_after": high_risk_after,
    "tenant": {"id": "tenant-123"},
    "context": {"reason": "strategic price change", "requested_at": "2025-01-15T12:00:00Z"}
  }
  decision := price_plan_changes.decision with input as test_input
  decision.allowed
  decision.reason == "change_risk_high"
  decision.required_approvals == ["finance_manager", "cfo"]
  decision.flags[_] == "high_revenue_impact"
}

test_floor_price_violation_blocked if {
  test_input := {
    "subject": base_subject,
    "plan_before": pricing.before,
    "plan_after": pricing.after_risky,
    "tenant": {"id": "tenant-123"},
    "context": {"reason": "aggressive discount", "requested_at": "2025-01-15T12:00:00Z"}
  }
  decision := price_plan_changes.decision with input as test_input
  not decision.allowed
}
