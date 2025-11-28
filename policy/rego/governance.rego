package governance

default allow = false
default log_event = true

# Context: input.environment, input.user, input.action, input.resource

# Main decision entry point
allow {
    is_admin
}

allow {
    input.environment == "dev"
    # Dev is permissive but tracked
}

allow {
    not blocked_by_compliance
    has_permission
    runtime_check_passed
}

is_admin {
    input.user.role == "admin"
}

has_permission {
    # Delegate to access_control policy if available
    # data.access_control.allow
    # For now, simple check
    input.user.permissions[_] == input.action
}

blocked_by_compliance {
    input.resource.sensitivity == "TOP_SECRET"
    input.user.clearance_level < 5
}

runtime_check_passed {
    # Check if copilot query is safe
    input.action == "copilot_query"
    not contains_pii(input.resource.query)
}

runtime_check_passed {
    input.action != "copilot_query"
}

contains_pii(query) {
    regex.match("ssn|credit card", lower(query))
}
