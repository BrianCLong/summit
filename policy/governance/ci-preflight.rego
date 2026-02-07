package policy.preflight

import future.keywords.if

default allow = false

default failures = []

allow if count(failures) == 0

failures contains "tests_failed" if input.tests.failed > 0

failures contains "lint_errors" if input.lint.errors > 0

failures contains "security_findings" if input.security_findings > 0

failures contains "missing_required_evidence" if count(input.required_evidence) > 0

violations := failures
