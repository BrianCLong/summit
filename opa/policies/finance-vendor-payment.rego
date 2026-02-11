package finance.vendor_payment

import rego.v1

# Default decision
default decision := {
    "action": "deny",
    "reasons": ["Default deny"],
    "required_approvers": [],
    "rationale_required": false
}

# Decision logic
decision := {
    "action": action,
    "reasons": [reason],
    "required_approvers": approvers,
    "rationale_required": rationale
} if {
    action := get_action
    reason := get_reason(action)
    approvers := get_approvers(action)
    rationale := is_rationale_required(action)
}

# Determine Action
get_action := "allow" if {
    input.user.role == "FinanceAdmin"
    is_number(input.payment.amount)
    input.payment.amount < 5000
} else := "allow_with_approval" if {
    input.user.role == "FinanceAdmin"
    is_number(input.payment.amount)
    input.payment.amount >= 5000
} else := "allow_with_approval" if {
    input.user.role == "FinanceApprover"
    is_number(input.payment.amount)
} else := "deny"

# Reasons
get_reason(action) := "Auto-approved for FinanceAdmin under threshold" if action == "allow"
get_reason(action) := "Human approval required based on amount or role" if action == "allow_with_approval"
get_reason(action) := "Payment request denied by policy" if action == "deny"

# Required Approvers
get_approvers(action) := ["FinanceAdmin"] if {
    action == "allow_with_approval"
    is_number(input.payment.amount)
    input.payment.amount > 10000
} else := ["FinanceApprover", "FinanceAdmin"] if {
    action == "allow_with_approval"
} else := []

# Rationale Requirement
is_rationale_required(action) := true if {
    action == "allow_with_approval"
} else := false
