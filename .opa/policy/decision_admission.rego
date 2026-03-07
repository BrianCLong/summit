package summit.decision.admission

default allowed = false

deny[msg] {
  count(input.spec.evidenceIds) == 0
  msg := "missing_evidence_ids"
}

deny[msg] {
  input.spec.riskTier == "high"
  not input.approvals.human
  msg := "high_risk_requires_human_approval"
}

allowed {
  count(deny) == 0
}
