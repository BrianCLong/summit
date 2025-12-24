package compliance.access

import future.keywords.if
import future.keywords.in

default allow = false

# Allow if the user has a valid role, the action is logged, and no deny rules are triggered
allow if {
    input.user.role in ["internal_service", "auditor", "admin"]
    input.feature != "unlogged_decision_path"
    not deny
}

# Explicit deny for unlogged paths
deny if {
    input.feature == "unlogged_decision_path"
}

# Require explainability for EU region on sensitive features
deny if {
    input.region == "EU"
    input.feature == "unexplained_model_output"
}
