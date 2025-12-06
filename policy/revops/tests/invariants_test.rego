package revops.invariants_test

import data.revops.invariants

# Discounts cannot exceed the global maximum.
test_global_discount_cap {
  input := {
    "quote": {"discount_percentage": 80}
  }

  invariants.deny_discount["exceeds_global_max_discount"] with input as input
}

# Contracts must be signed before activation.
test_contract_must_be_signed {
  input := {
    "contract": {"status": "draft"}
  }

  invariants.deny_activation["contract_not_signed"] with input as input
}
