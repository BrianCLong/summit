package billing.cost_model_changes

import data.billing.invariants

allowed_roles := {"finops_owner", "finance_manager", "cfo"}

default decision = {
  "allowed": false,
  "reason": "not_evaluated",
  "required_approvals": [],
  "flags": []
}

decision = out {
  subj := input.subject
  allowed_roles[subj.role]
  not invariants.cost_model_blocked(input)

  approvals := ["finops_owner", "cfo"]
  flags := flags_for(input)

  out := {
    "allowed": true,
    "reason": "cost_model_change_requires_dual_approval",
    "required_approvals": approvals,
    "flags": flags
  }
}

flags_for(input) = flags {
  base := ["unit_economics"]
  missing_analysis := {f | input.context.impact_analysis == ""; f := "missing_impact_analysis"}
  retroactive := {f | input.model_before.effective_at > input.model_after.effective_at; f := "retroactive_change"}
  flags := array.concat(base, array.concat(missing_analysis, retroactive))
}
