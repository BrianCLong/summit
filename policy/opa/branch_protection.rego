package branchprotection

default allow = false

# Input expectation:
# input.required_checks = ["check1", "check2"]
# input.branch_protection.required_checks = ["check1", "check2", "check3"]

required := input.required_checks
configured := {c | c := input.branch_protection.required_checks[_]}

allow {
  # Must have at least one required check
  count(required) > 0
  # All required checks must be present in the configured checks
  every r in required { r == configured[_] }
}

# Helper to identify missing checks for error reporting
missing[check] {
  check := input.required_checks[_]
  not configured[check]
}

deny[msg] {
  m := missing[_]
  msg := sprintf("Missing required check in branch protection: %v", [m])
}
