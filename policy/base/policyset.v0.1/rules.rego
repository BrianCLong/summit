package switchboard.policy.v0_1

import rego.v1

# Default: Deny everything
default allow = false

# Allowed if all checks pass
allow if {
    input.type == "action"
    is_capability_allowed
    is_mode_allowed
    is_within_budget
}

# Check if the requested capability is permitted for the skill
is_capability_allowed if {
    some cap in input.skill.permissions.requested_capabilities
    cap.capability == input.action.capability
    # Check scopes if present
    satisfies_scope(cap.scope, input.action.params)
}

# Simple scope check (placeholder for complex logic)
satisfies_scope(scope, params) if {
    # If scope has allowed providers, param provider must be in list
    not scope.providers
}

satisfies_scope(scope, params) if {
    scope.providers
    params.provider in scope.providers
}

# Mode gates: Observe, Assist, Autopilot
is_mode_allowed if {
    input.mode == "observe"
    # Observe mode only allows read-only actions (simplified check)
    startswith(input.action.capability, "read.")
}

is_mode_allowed if {
    input.mode == "assist"
    # Assist mode allows actions but requires approval for sensitive ones
    not requires_approval(input.action.capability)
}

is_mode_allowed if {
    input.mode == "assist"
    requires_approval(input.action.capability)
    input.approval.granted == true
}

is_mode_allowed if {
    input.mode == "autopilot"
    # Autopilot allowed only if workflow is pre-approved
    input.workflow.is_pre_approved == true
}

# Define what requires approval
requires_approval(cap) if {
    some approved_cap in input.skill.permissions.requires_user_approval_for
    approved_cap == cap
}

# Budget check
is_within_budget if {
    input.cost.current_spend + input.cost.estimated_cost <= input.budget.limit
}
