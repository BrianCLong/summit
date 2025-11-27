package revops.contract_activation_test

import data.revops.contract_activation
import data.revops_fixtures

# Contracts with required signatures and approvals pass activation.
test_contract_activation_ok {
  contract := revops_fixtures.contracts[0]
  input := {
    "contract": contract,
    "tenant": {"id": "tenant-default"}
  }

  decision := revops.contract_activation.decision with input as input
  decision.allowed
  decision.required_actions == []
}

# Contracts missing signature are blocked by invariants.
test_contract_missing_signature_denied {
  contract := revops_fixtures.contracts[1]
  input := {
    "contract": contract,
    "tenant": {"id": "tenant-default"}
  }

  decision := revops.contract_activation.decision with input as input
  decision.allowed == false
}
