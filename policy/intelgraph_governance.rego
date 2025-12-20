# policy/intelgraph_governance.rego
package intelgraph.governance

# Deny by default
default allow = false

# Rule 1: Read access is granted based on user role and data sensitivity.
# We'll define a mapping of roles to the sensitivity levels they can access.
role_sensitivity_access := {
    "analyst": {"public", "internal"},
    "senior_analyst": {"public", "internal", "confidential"},
    "admin": {"public", "internal", "confidential", "secret", "top-secret"}
}

# Allow read access if the user's role permits access to the resource's sensitivity level.
allow_read if {
    # This rule applies to 'read' actions
    input.action == "read"

    # Get the user's roles and the resource's sensitivity
    user_roles := input.subject.roles
    resource_sensitivity := input.resource.sensitivity

    # Check if any of the user's roles grant access to this sensitivity level
    some role in user_roles
    allowed_sensitivities := role_sensitivity_access[role]
    some s in allowed_sensitivities
    s == resource_sensitivity
}

# Rule 2: Export rule requiring redaction for sensitive labels.
# This rule checks if an export action is requested and if the resource has sensitive data.
# The 'redact' decision will be a set of fields that need redaction.
redact contains field if {
    # This rule applies to 'export' actions
    input.action == "export"

    # Check if the resource sensitivity is above 'internal'
    resource_sensitivity := input.resource.sensitivity
    resource_sensitivity != "public"
    resource_sensitivity != "internal"

    # Identify fields marked as sensitive in the resource
    # (This assumes a 'sensitive_fields' attribute on the resource object)
    sensitive_fields := input.resource.sensitive_fields
    some field in sensitive_fields
}

# Rule 3: Deny-by-default is already handled by the first line, but we'll make an explicit rule
# for unknown actors or roles for clarity. This rule will contribute to a 'deny' decision.
deny_unknown_actor[msg] if {
    # Deny if the subject is missing, or if their roles array is missing or empty.
    count(input.subject.roles) == 0
    msg := "Request denied: Subject has no roles or is not properly defined."
}


# Final Decision Logic:
# Allow if the read rule passes and there are no explicit denials.
# For other actions, we'll need to define more rules.
allow if {
    allow_read
    count(deny_unknown_actor) == 0
}

# Note: The 'export' action is not explicitly allowed here. A client application would
# check the 'redact' rule and decide how to proceed. It might allow the export but
# apply the redactions, or deny it if redaction is not possible.
