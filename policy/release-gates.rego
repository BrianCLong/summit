package release

import future.keywords.if

# Default deny
default allow := false

# Allow if all gates pass
allow if {
    input.train == "canary"
}

allow if {
    input.train == "integration"
    input.canary_health_duration_hours >= 24
    input.integration_tests_passed
}

allow if {
    input.train == "stable"
    input.release_captain_approval
    input.integration_tests_passed
    not input.blocking_issues
}

allow if {
    input.train == "ga"
    input.stable_duration_weeks >= 2
    input.executive_approval
    input.security_audit_passed
}
