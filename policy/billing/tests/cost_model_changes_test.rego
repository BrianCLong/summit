package billing.cost_model_changes_test

import data.billing.cost_model_changes

base_subject := {"id": "finops-1", "role": "finops_owner"}

model_before := {
  "version": "2025.01",
  "allocations": {"cpu": 0.5, "storage": 0.5},
  "effective_at": "2025-01-01T00:00:00Z"
}

model_after := {
  "version": "2025.02",
  "allocations": {"cpu": 0.6, "storage": 0.4},
  "effective_at": "2025-02-01T00:00:00Z"
}

test_cost_model_change_requires_dual_approval {
  input := {
    "subject": base_subject,
    "model_before": model_before,
    "model_after": model_after,
    "context": {"reason": "reflect infra mix shift", "requested_at": "2025-02-10T12:00:00Z", "impact_analysis": "+2% gross margin"}
  }
  decision := cost_model_changes.decision with input as input
  decision.allowed
  decision.required_approvals == ["finops_owner", "cfo"]
  decision.flags[_] == "unit_economics"
}

test_cost_model_missing_analysis_flagged {
  input := {
    "subject": base_subject,
    "model_before": model_before,
    "model_after": model_after,
    "context": {"reason": "quick tweak", "requested_at": "2025-02-10T12:00:00Z", "impact_analysis": ""}
  }
  decision := cost_model_changes.decision with input as input
  decision.allowed
  decision.flags[_] == "missing_impact_analysis"
}
