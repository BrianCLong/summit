import future.keywords.in
import future.keywords.if
package revops.invariants_test

import data.revops.invariants

# Discounts cannot exceed the global maximum.
test_global_discount_cap if {
  test_input := {
    "quote": {"discount_percentage": 80}
  }

  invariants.deny_discount["exceeds_global_max_discount"] with input as test_input
}

# Contracts must be signed before activation.
test_contract_must_be_signed if {
  test_input := {
    "contract": {"status": "draft"}
  }

  invariants.deny_activation["contract_not_signed"] with input as test_input
}
