package release

# Default deny
default allow = false

# Allow if all gates pass
allow {
    input.train == "canary"
}

allow {
    input.train == "integration"
    input.canary_health_duration_hours >= 24
    input.integration_tests_passed
}

allow {
    input.train == "stable"
    input.release_captain_approval
    input.integration_tests_passed
    not input.blocking_issues
}

allow {
    input.train == "ga"
    input.stable_duration_weeks >= 2
    input.executive_approval
    input.security_audit_passed
}
