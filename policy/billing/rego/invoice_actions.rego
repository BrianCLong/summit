package billing.invoice_actions

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
  not invariants.invoice_action_blocked(input)

  risk := risk_band(input.invoice.amount)
  approvals := approvals_for(input.action, risk, input)
  flags := flags_for(input.action, risk)

  out := {
    "allowed": true,
    "reason": sprintf("%s_%s", [input.action, risk]),
    "required_approvals": approvals,
    "flags": flags
  }
}

risk_band(amount) = "high" {
  amount >= invariants.high_invoice_threshold
} else = "medium" {
  amount >= 10000
} else = "low"

approvals_for("generate", _, _) = []
approvals_for("mark_sent", _, _) = []
approvals_for("mark_paid", "low", input) = approvals {
  approvals := []
  input.context.source == "psp"
}
approvals_for("mark_paid", _, _) = ["finance_manager"]
approvals_for("cancel", "high", _) = ["finance_manager", "cfo"]
approvals_for("cancel", _, _) = ["finance_manager"]
approvals_for("write_off", "high", _) = ["finance_manager", "cfo"]
approvals_for("write_off", _, _) = ["finance_manager"]
approvals_for("adjust", "high", _) = ["finance_manager", "cfo"]
approvals_for("adjust", _, _) = ["finance_manager"]

flags_for(action, risk) = flags {
  base := []
  requires_evidence := {f | action == "mark_paid"; f := "payment_evidence"}
  value_flag := {f | risk != "low"; f := "high_value"}
  irreversible := {f | action == "cancel"; f := "irreversible"}
  flags := array.concat(base, array.concat(array.concat([], requires_evidence), array.concat(value_flag, irreversible)))
}
