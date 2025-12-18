package billing.credits_and_discounts

import data.billing.invariants

allowed_roles := {"finance_analyst", "finance_manager", "revops_lead", "cfo"}

default decision = {
  "allowed": false,
  "reason": "not_evaluated",
  "required_approvals": [],
  "flags": []
}

decision = out {
  subj := input.subject
  allowed_roles[subj.role]
  not invariants.credit_blocked(input)

  risk := risk_band(input.credit_memo.amount, input.credit_memo.type)
  approvals := approvals_for(risk, input.credit_memo.type)
  flags := flags_for(risk, input.credit_memo.type)

  out := {
    "allowed": true,
    "reason": sprintf("credit_%s_%s", [input.credit_memo.type, risk]),
    "required_approvals": approvals,
    "flags": flags
  }
}

risk_band(amount, _) = "high" {
  amount >= invariants.high_credit_threshold
} else = "medium" {
  amount >= 5000
} else = "low"

approvals_for("low", _) = ["finance_manager"]
approvals_for("medium", _) = ["finance_manager", "revops_lead"]
approvals_for("high", _) = ["finance_manager", "revops_lead", "cfo"]

flags_for(risk, memo_type) = flags {
  base := [memo_type]
  impact := {f | risk != "low"; f := "revenue_impact"}
  recurring := {f | memo_type == "discount"; f := "recurring_change"}
  flags := array.concat(base, array.concat(impact, recurring))
}
