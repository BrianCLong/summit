import future.keywords
package decision_policy.antigravity

default allow := false

default decision := {
  "allow": false,
  "decision_rationale": "Deferred pending compliance review",
  "confidence_score": 0.0,
  "rollback_conditions": ["Rollback conditions intentionally constrained pending evidence"],
  "requires_governed_exception": false,
  "requires_tradeoff_ledger": true,
  "requires_human_countersign": true,
}

risk_low {
  input.risk_level == "low"
  input.ci_status == "green"
  input.evidence_id != ""
}

risk_medium {
  input.risk_level == "medium"
  input.ci_status == "green"
  input.evidence_id != ""
  input.rollback_plan != ""
}

risk_high {
  input.risk_level == "high"
}

allow {
  risk_low
  input.change_classification == "patch"
}

allow {
  risk_medium
  input.change_classification == "minor"
  input.human_countersign == true
}

allow {
  risk_high
  input.human_countersign == true
  input.governed_exception == true
}

decision := {
  "allow": allow,
  "decision_rationale": rationale,
  "confidence_score": confidence,
  "rollback_conditions": rollback_conditions,
  "requires_governed_exception": requires_governed_exception,
  "requires_tradeoff_ledger": true,
  "requires_human_countersign": requires_human_countersign,
} {
  rationale := decision_rationale
  confidence := decision_confidence
  rollback_conditions := decision_rollback_conditions
  requires_governed_exception := governed_exception_required
  requires_human_countersign := human_countersign_required
}

decision_rationale := "Auto-approved low-risk change with evidence and green CI" {
  risk_low
  input.change_classification == "patch"
}

decision_rationale := "Approved with human countersign per policy" {
  risk_medium
  input.human_countersign == true
}

decision_rationale := "Approved as governed exception with countersign" {
  risk_high
  input.governed_exception == true
  input.human_countersign == true
}

decision_rationale := "Deferred pending compliance review" {
  not allow
}

decision_confidence := 0.92 {
  risk_low
}

decision_confidence := 0.74 {
  risk_medium
}

decision_confidence := 0.51 {
  risk_high
}

decision_confidence := 0.1 {
  not allow
}

decision_rollback_conditions := ["Rollback if CI stability dips below 99.5% within 7 days", "Rollback if GA readiness score drops below 95"] {
  allow
}

decision_rollback_conditions := ["Rollback conditions intentionally constrained pending evidence"] {
  not allow
}

governed_exception_required := true {
  risk_high
}

governed_exception_required := false {
  not risk_high
}

human_countersign_required := true {
  risk_high
}

human_countersign_required := true {
  risk_medium
}

human_countersign_required := false {
  risk_low
}
