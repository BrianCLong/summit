# ABAC (Attribute-Based Access Control) Policy for IntelGraph
# Implements fine-grained access control based on user, resource, and environmental attributes

package abac
import future.keywords.if
import future.keywords.in



# Default deny - explicit allow required
default allow := false

# Allow decisions based on role and resource type
allow if {
    input.user.roles[_] == "admin"
    not deny_for_maintenance
}

allow if {
    input.user.roles[_] == "analyst"
    input.resource.type in analyst_allowed_resources
    not sensitive_operation
}

allow if {
    input.user.roles[_] == "viewer"
    input.action == "read"
    input.resource.type in viewer_allowed_resources
    not sensitive_data
}

# Privileged operations require step-up authentication
allow if {
    privileged_operation
    input.user.stepup_verified
    input.user.stepup_timestamp
    time.now_ns() - input.user.stepup_timestamp < step_up_ttl_ns
}

# Tenant isolation enforcement
allow if {
    not privileged_operation
    tenant_isolation_satisfied
}

# Time-based access controls
allow if {
    not sensitive_operation
    business_hours
}

allow if {
    sensitive_operation
    business_hours
    input.user.roles[_] in ["admin", "senior-analyst"]
}

# Emergency access with audit trail
allow if {
    input.emergency_access
    input.user.roles[_] == "admin"
    valid_emergency_justification
}

# Resource-specific rules
analyst_allowed_resources := {
    "investigation",
    "entity",
    "relationship",
    "export",
    "dashboard",
    "report"
}

viewer_allowed_resources := {
    "investigation",
    "entity",
    "relationship",
    "dashboard",
    "report"
}

# Sensitive operations that require elevated privileges
privileged_operation if {
    input.action in [
        "create_investigation",
        "delete_investigation",
        "modify_entity",
        "bulk_export",
        "admin_action"
    ]
}

sensitive_operation if {
    input.action in [
        "delete",
        "bulk_delete",
        "modify_system_config",
        "user_management"
    ]
}

# Sensitive data classification
sensitive_data if {
    input.resource.classification in ["confidential", "secret"]
}

sensitive_data if {
    input.resource.tags[_] == "pii"
}

sensitive_data if {
    input.resource.tags[_] == "financial"
}

# Tenant isolation check
tenant_isolation_satisfied if {
    # Global admins can access any tenant
    input.user.roles[_] == "global-admin"
}

tenant_isolation_satisfied if {
    # Users can only access their own tenant data
    input.user.tenant_id == input.resource.tenant_id
}

tenant_isolation_satisfied if {
    # Cross-tenant operations explicitly approved
    input.cross_tenant_approved
    input.approver_tenant_id
}

# Business hours check (8 AM - 6 PM UTC)
business_hours if {
    hour := time.hour(time.now_ns())
    hour >= 8
    hour < 18
}

# Step-up authentication TTL (5 minutes)
step_up_ttl_ns := 300 * 1000000000

# Maintenance mode check
deny_for_maintenance if {
    input.system.maintenance_mode
    not input.user.roles[_] == "admin"
}

# Emergency access validation
valid_emergency_justification if {
    input.emergency_justification
    count(input.emergency_justification) >= 50  # Minimum 50 characters
    input.emergency_contact
}

# DLP (Data Loss Prevention) rules
deny if {
    input.action == "export"
    sensitive_data
    not input.user.roles[_] in ["admin", "compliance-officer"]
}

deny if {
    input.action == "bulk_export"
    not input.user.roles[_] == "admin"
    not input.compliance_approved
}

# API rate limiting decisions
allow if {
    input.resource.type == "api_call"
    within_rate_limit
}

within_rate_limit if {
    # Standard users: 100 requests per hour
    input.user.roles[_] == "viewer"
    input.user.hourly_request_count < 100
}

within_rate_limit if {
    # Analysts: 500 requests per hour
    input.user.roles[_] == "analyst"
    input.user.hourly_request_count < 500
}

within_rate_limit if {
    # Admins: 1000 requests per hour
    input.user.roles[_] == "admin"
    input.user.hourly_request_count < 1000
}

# Audit requirements
audit_required if {
    privileged_operation
}

audit_required if {
    sensitive_data
}

audit_required if {
    input.action == "export"
}

# Policy metadata for debugging
policy_metadata := {
    "version": "1.0.0",
    "last_updated": "2025-09-19T00:00:00Z",
    "description": "ABAC policy for IntelGraph platform",
    "contact": "security-team@intelgraph.io"
}

# Detailed decision explanation for debugging
decision_explanation := explanation if {
    allow
    explanation := {
        "decision": "allow",
        "reasons": reasons_for_allow,
        "user": input.user,
        "resource": input.resource,
        "action": input.action,
        "timestamp": time.now_ns()
    }
}

decision_explanation := explanation if {
    not allow
    explanation := {
        "decision": "deny",
        "reasons": reasons_for_deny,
        "user": input.user,
        "resource": input.resource,
        "action": input.action,
        "timestamp": time.now_ns(),
        "required_permissions": required_permissions_for_resource
    }
}

reasons_for_allow := reasons if {
    allow
    reasons := [
        reason |
        checks := [
            ["admin_role", input.user.roles[_] == "admin"],
            ["business_hours", business_hours],
            ["tenant_isolated", tenant_isolation_satisfied],
            ["step_up_valid", input.user.stepup_verified],
            ["rate_limit_ok", within_rate_limit]
        ]
        check := checks[_]
        check[1] == true
        reason := check[0]
    ]
}

reasons_for_deny := reasons if {
    not allow
    reasons := [
        reason |
        checks := [
            ["maintenance_mode", deny_for_maintenance],
            ["insufficient_role", not sufficient_role],
            ["outside_business_hours", not business_hours],
            ["tenant_violation", not tenant_isolation_satisfied],
            ["step_up_required", privileged_operation; not input.user.stepup_verified],
            ["rate_limit_exceeded", not within_rate_limit],
            ["sensitive_data_restriction", sensitive_data; not authorized_for_sensitive]
        ]
        check := checks[_]
        check[1] == true
        reason := check[0]
    ]
}

sufficient_role if {
    input.user.roles[_] == "admin"
}

sufficient_role if {
    input.user.roles[_] == "analyst"
    input.resource.type in analyst_allowed_resources
}

sufficient_role if {
    input.user.roles[_] == "viewer"
    input.action == "read"
    input.resource.type in viewer_allowed_resources
}

authorized_for_sensitive if {
    input.user.roles[_] in ["admin", "compliance-officer"]
}

required_permissions_for_resource := permissions if {
    input.resource.type == "investigation"
    permissions := ["analyst", "admin"]
}

required_permissions_for_resource := permissions if {
    input.resource.type == "system_config"
    permissions := ["admin"]
}

required_permissions_for_resource := permissions if {
    input.resource.type == "user_management"
    permissions := ["admin"]
}
