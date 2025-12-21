package revops.pipeline_governance_test

import data.revops.pipeline_governance
import data.revops_fixtures.pipeline_cases

# Healthy pipeline respects stage order, hygiene, and returns coverage/velocity metrics.
test_pipeline_governance_passes_healthy_case {
  input := pipeline_cases.healthy_new
  decision := pipeline_governance.decision with input as input

  decision.allowed
  decision.reason == "ok"
  count(decision.violations) == 0
  decision.metrics.coverage == 3
  decision.metrics.velocity_days == 19
  decision.risk.score == 0
  decision.flags[_] == "trustworthy_dashboard"
}

# Closed-lost requires reason codes and complete required fields; missing data blocks progression.
test_pipeline_governance_requires_reason_and_fields {
  input := pipeline_cases.closed_without_reason
  decision := pipeline_governance.decision with input as input

  not decision.allowed
  "reason_code_missing" == decision.violations[_]
  "required_fields_missing" == decision.violations[_]
  "coverage_low" == decision.flags[_]
  decision.risk.score > 0
}

# Renewal cases must have ownership alignment and renewal details; violations push risk and block.
test_pipeline_governance_flags_renewal_conflicts {
  input := pipeline_cases.renewal_conflict
  decision := pipeline_governance.decision with input as input

  not decision.allowed
  "territory_conflict" == decision.violations[_]
  "renewal_incomplete" == decision.violations[_]
  decision.risk.score > 0
  decision.handoffs.gaps[_] == "missing_sales_to_cs"
}
