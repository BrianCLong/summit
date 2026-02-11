package revops.contract_activation

import future.keywords.if
import future.keywords.contains
import data.revops.config
import data.revops.invariants

default decision := {
  "allowed": false,
  "reason": "not_evaluated",
  "required_actions": [],
  "flags": []
}

decision := out if {
  contract := input.contract
  tenant := input.tenant.id

  rules := config.tenant[tenant].contracts

  count(invariants.deny_activation) == 0 with input as input

  approvals_okay(contract, rules)
  signatures_okay(contract, rules)

  out := {
    "allowed": true,
    "reason": "ok",
    "required_actions": required_actions(contract, rules),
    "flags": contract.flags
  }
}

approvals_okay(contract, rules) if {
  count([req | some req in rules.required_approvals; missing_required_approval(contract, req)]) == 0
}

missing_required_approval(contract, req) if {
  not contract_has_approval(contract, req)
}

contract_has_approval(contract, req) if {
  contract.approvals[_] == req
}

signatures_okay(contract, rules) if {
  count([req | some req in rules.required_signers; missing_required_signature(contract, req)]) == 0
}

missing_required_signature(contract, req) if {
  not contract_has_signature(contract, req)
}

contract_has_signature(contract, req) if {
  some s
  contract.signatures[s].role == req
}

# Helper to check if any signatures are missing
has_missing_signatures(contract, rules) if {
  missing_required_signature(contract, rules.required_signers[_])
}

# Helper to check if any approvals are missing
has_missing_approvals(contract, rules) if {
  missing_required_approval(contract, rules.required_approvals[_])
}

# Required actions - both missing
required_actions(contract, rules) := ["collect_signatures", "capture_missing_approvals"] if {
  has_missing_signatures(contract, rules)
  has_missing_approvals(contract, rules)
}

# Required actions - only signatures missing
required_actions(contract, rules) := ["collect_signatures"] if {
  has_missing_signatures(contract, rules)
  not has_missing_approvals(contract, rules)
}

# Required actions - only approvals missing
required_actions(contract, rules) := ["capture_missing_approvals"] if {
  not has_missing_signatures(contract, rules)
  has_missing_approvals(contract, rules)
}

# Required actions - nothing missing
required_actions(contract, rules) := [] if {
  not has_missing_signatures(contract, rules)
  not has_missing_approvals(contract, rules)
}
