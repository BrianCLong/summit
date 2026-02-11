package billing.invoice_actions

import future.keywords.if

import data.billing.invariants

allowed_roles := {"finance_analyst", "finance_manager", "revops_lead", "cfo"}

default decision := {
  "allowed": false,
  "reason": "not_evaluated",
  "required_approvals": [],
  "flags": []
}

decision := out if {
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

risk_band(amount) := "high" if {
  amount >= invariants.high_invoice_threshold
} else := "medium" if {
  amount >= 10000
} else := "low"

approvals_for("generate", _, _) := []
approvals_for("mark_sent", _, _) := []
approvals_for("mark_paid", "low", req) := [] if {
  req.context.source == "psp"
}
approvals_for("mark_paid", risk, req) := ["finance_manager"] if {
  not mark_paid_auto_approved(risk, req)
}
approvals_for("cancel", "high", _) := ["finance_manager", "cfo"]
approvals_for("cancel", risk, _) := ["finance_manager"] if { risk != "high" }
approvals_for("write_off", "high", _) := ["finance_manager", "cfo"]
approvals_for("write_off", risk, _) := ["finance_manager"] if { risk != "high" }
approvals_for("adjust", "high", _) := ["finance_manager", "cfo"]
approvals_for("adjust", risk, _) := ["finance_manager"] if { risk != "high" }

mark_paid_auto_approved(risk, req) if {
  risk == "low"
  req.context.source == "psp"
}

flags_for(action, risk) := flags if {
  base := []
  requires_evidence := ["payment_evidence" | action == "mark_paid"]
  value_flag := ["high_value" | risk != "low"]
  irreversible := ["irreversible" | action == "cancel"]
  flags := array.concat(base, array.concat(array.concat([], requires_evidence), array.concat(value_flag, irreversible)))
}
