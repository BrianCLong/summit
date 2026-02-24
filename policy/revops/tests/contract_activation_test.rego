package revops.contract_activation_test
import future.keywords.if

import data.revops.contract_activation
import data.revops_fixtures

# Contracts with required signatures and approvals pass activation.
test_contract_activation_ok if {
  contract := revops_fixtures.contracts[0]
  test_input := {
    "contract": contract,
    "tenant": {"id": "tenant-default"}
  }

  decision := contract_activation.decision with input as test_input
  decision.allowed
  decision.required_actions == []
}

# Contracts missing signature are blocked by invariants.
test_contract_missing_signature_denied if {
  contract := revops_fixtures.contracts[1]
  test_input := {
    "contract": contract,
    "tenant": {"id": "tenant-default"}
  }

  decision := contract_activation.decision with input as test_input
  decision.allowed == false
}
