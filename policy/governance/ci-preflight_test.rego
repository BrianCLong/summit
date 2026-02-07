package policy.preflight

test_allow_when_clean {
  allow with input as {
    "tests": {"failed": 0},
    "lint": {"errors": 0},
    "security_findings": 0,
    "required_evidence": []
  }
}

test_denies_when_failures_present {
  not allow with input as {
    "tests": {"failed": 1},
    "lint": {"errors": 0},
    "security_findings": 0,
    "required_evidence": []
  }
}

expected_failures := {
  "lint_errors",
  "security_findings",
  "missing_required_evidence"
}

test_failure_reasons_capture_all {
  failures := failures with input as {
    "tests": {"failed": 0},
    "lint": {"errors": 2},
    "security_findings": 4,
    "required_evidence": ["EV-001"]
  }
  expected_failures == {f | f := failures[_]}
}
