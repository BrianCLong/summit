package revops.contract_activation

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

  not invariants.deny_activation[_] with input as input

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
  not missing_required_approval(contract, rules.required_approvals[_])
}

missing_required_approval(contract, req) if {
  not contract_has_approval(contract, req)
}

contract_has_approval(contract, req) if {
  contract.approvals[_] == req
}

signatures_okay(contract, rules) if {
  not missing_required_signature(contract, rules.required_signers[_])
}

missing_required_signature(contract, req) if {
  not contract_has_signature(contract, req)
}

contract_has_signature(contract, req) if {
  some s
  contract.signatures[s].role == req
}

required_actions(contract, rules) := actions if {
  missing_signatures := count([req | req := rules.required_signers[_]; missing_required_signature(contract, req)]) > 0
  missing_approvals := count([req | req := rules.required_approvals[_]; missing_required_approval(contract, req)]) > 0

  sig_actions := ["collect_signatures"] if { missing_signatures }
  sig_actions := [] if { not missing_signatures }

  approval_actions := ["capture_missing_approvals"] if { missing_approvals }
  approval_actions := [] if { not missing_approvals }

  actions := array.concat(sig_actions, approval_actions)
}
