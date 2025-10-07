# ABAC Enhanced Policy Engine - RBAC Phase 3
# Attribute-Based Access Control with deny-by-default

package abac.enhanced

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Attribute definitions
attributes := {
    "tenant": input.user.tenant,
    "environment": input.resource.environment,
    "sensitivity": input.resource.sensitivity_level,
    "case_ownership": input.resource.case_owner,
    "user_clearance": input.user.clearance_level,
    "user_role": input.user.role,
    "resource_type": input.resource.type,
    "action": input.action
}

# Sensitivity levels (ordered)
sensitivity_levels := ["public", "internal", "confidential", "secret", "top_secret"]

# Environment types
environments := ["dev", "staging", "prod", "gov_cloud"]

# ABAC Rules

# Rule 1: Tenant isolation enforcement
tenant_isolated if {
    input.user.tenant == input.resource.tenant
}

# Rule 2: Environment access control
environment_access_allowed if {
    # Prod access requires prod role
    input.resource.environment == "prod"
    input.user.role in ["admin", "prod_operator", "incident_responder"]
}

environment_access_allowed if {
    # Non-prod environments accessible to all authenticated users
    input.resource.environment in ["dev", "staging"]
}

# Rule 3: Sensitivity clearance check
clearance_sufficient if {
    user_clearance_index := indexof(sensitivity_levels, input.user.clearance_level)
    resource_sensitivity_index := indexof(sensitivity_levels, input.resource.sensitivity_level)
    user_clearance_index >= resource_sensitivity_index
}

# Rule 4: Case ownership check (for case-related resources)
case_access_allowed if {
    not input.resource.case_owner  # No case owner means not case-specific
}

case_access_allowed if {
    input.resource.case_owner == input.user.id  # Owner has access
}

case_access_allowed if {
    input.user.role in ["admin", "case_supervisor"]  # Supervisors have access
}

# Rule 5: Write action restrictions
write_action_allowed if {
    input.action in ["read", "list", "query"]  # Read actions always allowed (if other rules pass)
}

write_action_allowed if {
    input.action in ["create", "update", "delete"]
    input.user.role in ["admin", "analyst", "incident_responder"]
    input.resource.environment != "prod"  # Write to non-prod
}

write_action_allowed if {
    input.action in ["create", "update", "delete"]
    input.user.role in ["admin", "prod_operator"]
    input.resource.environment == "prod"  # Prod writes require special role
    input.user.has_step_up == true  # Step-up auth required for prod writes
}

# Rule 6: Export restrictions (sensitive)
export_allowed if {
    input.action == "export"
    input.user.role in ["admin", "compliance_officer"]
    input.user.has_step_up == true  # Step-up required for all exports
    clearance_sufficient
}

# Rule 7: Admin actions
admin_action_allowed if {
    input.action in ["manage_users", "manage_policies", "configure_system"]
    input.user.role == "admin"
    input.user.has_step_up == true
}

# Main allow rule - all conditions must pass
allow if {
    tenant_isolated
    environment_access_allowed
    clearance_sufficient
    case_access_allowed
    write_action_allowed
}

allow if {
    # Special handling for export
    tenant_isolated
    environment_access_allowed
    export_allowed
}

allow if {
    # Special handling for admin actions
    tenant_isolated
    admin_action_allowed
}

# Denial reasons for audit
deny_reasons contains reason if {
    not tenant_isolated
    reason := "tenant_isolation_violation"
}

deny_reasons contains reason if {
    not environment_access_allowed
    reason := sprintf("environment_access_denied: %s", [input.resource.environment])
}

deny_reasons contains reason if {
    not clearance_sufficient
    reason := sprintf("insufficient_clearance: user=%s, resource=%s", [
        input.user.clearance_level,
        input.resource.sensitivity_level
    ])
}

deny_reasons contains reason if {
    not case_access_allowed
    reason := sprintf("case_ownership_violation: case_owner=%s", [input.resource.case_owner])
}

deny_reasons contains reason if {
    input.action in ["create", "update", "delete", "export"]
    not input.user.has_step_up
    input.resource.environment == "prod"
    reason := "step_up_authentication_required"
}

# Evidence for allowed actions
evidence contains item if {
    allow
    item := {
        "decision": "allow",
        "user": input.user.id,
        "resource": input.resource.id,
        "action": input.action,
        "tenant": input.user.tenant,
        "attributes": attributes,
        "timestamp": time.now_ns()
    }
}

# Evidence for denied actions
evidence contains item if {
    not allow
    item := {
        "decision": "deny",
        "user": input.user.id,
        "resource": input.resource.id,
        "action": input.action,
        "tenant": input.user.tenant,
        "reasons": deny_reasons,
        "attributes": attributes,
        "timestamp": time.now_ns()
    }
}

# Policy metadata
policy_info := {
    "version": "3.0.0",
    "name": "ABAC Enhanced - RBAC Phase 3",
    "description": "Attribute-based access control with deny-by-default",
    "last_updated": "2025-11-03",
    "attributes_used": [
        "tenant",
        "environment",
        "sensitivity",
        "case_ownership",
        "user_clearance",
        "user_role",
        "resource_type",
        "action"
    ]
}

# Test helpers
test_allow_read_internal if {
    allow with input as {
        "user": {
            "id": "user123",
            "tenant": "acme",
            "role": "analyst",
            "clearance_level": "confidential",
            "has_step_up": false
        },
        "resource": {
            "id": "res456",
            "tenant": "acme",
            "environment": "staging",
            "sensitivity_level": "internal",
            "type": "document"
        },
        "action": "read"
    }
}

test_deny_cross_tenant if {
    not allow with input as {
        "user": {
            "id": "user123",
            "tenant": "acme",
            "role": "admin",
            "clearance_level": "top_secret",
            "has_step_up": true
        },
        "resource": {
            "id": "res456",
            "tenant": "globex",  # Different tenant
            "environment": "prod",
            "sensitivity_level": "internal",
            "type": "document"
        },
        "action": "read"
    }
}

test_deny_insufficient_clearance if {
    not allow with input as {
        "user": {
            "id": "user123",
            "tenant": "acme",
            "role": "analyst",
            "clearance_level": "internal",  # Not high enough
            "has_step_up": false
        },
        "resource": {
            "id": "res456",
            "tenant": "acme",
            "environment": "staging",
            "sensitivity_level": "secret",  # Requires higher clearance
            "type": "document"
        },
        "action": "read"
    }
}

test_require_stepup_for_export if {
    not allow with input as {
        "user": {
            "id": "user123",
            "tenant": "acme",
            "role": "admin",
            "clearance_level": "top_secret",
            "has_step_up": false  # No step-up
        },
        "resource": {
            "id": "res456",
            "tenant": "acme",
            "environment": "prod",
            "sensitivity_level": "confidential",
            "type": "document"
        },
        "action": "export"
    }
}
