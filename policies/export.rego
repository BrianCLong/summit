package intelgraph.export

import future.keywords.in

default allow = false

# Main entry point
allow {
    input.action == "export"
    not deny_export
}

# Deny rules
deny_export {
    needs_step_up
    not has_step_up
}

# Logic to determine if step-up is needed
needs_step_up {
    input.resource.sensitivity == "high"
}

has_step_up {
    input.user.auth_level >= 2
}

# Audit trail
audit_results := rs {
    rs := []
    rs1 := cond_append(rs, needs_step_up, "STEP_UP_REQUIRED")
    rs2 := cond_append(rs1, has_step_up, "STEP_UP_PRESENT")
    rs3 := cond_append(rs2, true, "EXPORT_EVALUATED")
    rs = rs3
}

# Helper
cond_append(list, true, val) := array.concat(list, [val])
cond_append(list, false, _) := list
