# Sandbox Tenant Policy
#
# This policy enforces strict isolation for sandbox/datalab tenants,
# preventing access to production data and blocking federation.

package intelgraph.sandbox

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Default deny all
default allow := false

# Sandbox tenant types
sandbox_tenant_types := {"sandbox", "datalab"}

# Blocked operations for all sandbox tenants
blocked_operations := {
    "federation",
    "cross_tenant_access",
    "production_linkback",
    "external_export"
}

# Restricted connectors
restricted_connectors := {
    "federation",
    "external_service",
    "production_database"
}

# PII field patterns
pii_field_patterns := [
    "ssn",
    "social_security",
    "credit_card",
    "card_number",
    "passport",
    "driver_license",
    "email",
    "phone",
    "address",
    "dob",
    "date_of_birth"
]

# ============================================================================
# Main Allow Rules
# ============================================================================

# Allow if tenant is not sandbox (production rules apply elsewhere)
allow if {
    not is_sandbox_tenant
}

# Allow sandbox operations that pass all checks
allow if {
    is_sandbox_tenant
    not operation_blocked
    not connector_blocked
    tenant_isolation_valid
    data_access_valid
}

# ============================================================================
# Tenant Type Checks
# ============================================================================

is_sandbox_tenant if {
    input.tenant.type in sandbox_tenant_types
}

is_sandbox_tenant if {
    input.sandbox_id != null
}

# ============================================================================
# Operation Blocking
# ============================================================================

operation_blocked if {
    input.operation in blocked_operations
}

operation_blocked if {
    input.operation == "query"
    contains(lower(input.query), "production")
}

operation_blocked if {
    input.operation == "mutation"
    input.target_tenant_id != input.sandbox_id
}

# ============================================================================
# Connector Blocking
# ============================================================================

connector_blocked if {
    input.connector_type in restricted_connectors
}

connector_blocked if {
    input.connector_type == "api"
    startswith(input.target_endpoint, "production")
}

connector_blocked if {
    input.connector_type == "database"
    input.target_database == "production"
}

# ============================================================================
# Tenant Isolation
# ============================================================================

tenant_isolation_valid if {
    # Ensure all data access is scoped to sandbox tenant
    input.tenant_id == input.sandbox_id
}

tenant_isolation_valid if {
    # Allow access to shared synthetic data
    input.data_source == "synthetic"
}

tenant_isolation_valid if {
    # Allow access to scenario data
    input.data_source == "scenario"
}

# ============================================================================
# Data Access Policy
# ============================================================================

data_access_valid if {
    # Synthetic only mode - must use synthetic data
    input.sandbox_config.data_access_mode == "synthetic_only"
    input.data_source == "synthetic"
}

data_access_valid if {
    # Anonymized mode - data must be anonymized
    input.sandbox_config.data_access_mode == "anonymized"
    input.data_anonymized == true
}

data_access_valid if {
    # Structure only mode - no actual data
    input.sandbox_config.data_access_mode == "structure_only"
    input.data_type == "schema"
}

data_access_valid if {
    # Default allow if not in restricted mode
    not input.sandbox_config.data_access_mode
}

# ============================================================================
# PII Handling
# ============================================================================

pii_detected if {
    some field in input.fields
    some pattern in pii_field_patterns
    contains(lower(field), pattern)
}

pii_blocked if {
    pii_detected
    input.sandbox_config.pii_handling == "block"
}

# ============================================================================
# Linkback Prevention
# ============================================================================

linkback_attempt if {
    # Detect attempts to link sandbox data to production
    input.operation == "query"
    input.target_includes_production_ids
}

linkback_attempt if {
    input.operation == "export"
    input.target_tenant_id != input.sandbox_id
}

linkback_attempt if {
    # Detect production entity references in sandbox operations
    some entity_id in input.entity_ids
    startswith(entity_id, "prod_")
}

# Block all linkback attempts
deny_linkback := result if {
    linkback_attempt
    result := {
        "allowed": false,
        "reason": "Linkback to production data is not permitted from sandbox",
        "code": "SANDBOX_LINKBACK_BLOCKED",
        "audit": true
    }
}

# ============================================================================
# Export Controls
# ============================================================================

export_allowed if {
    input.operation == "export"
    input.sandbox_config.max_export_mb > 0
    input.export_size_mb <= input.sandbox_config.max_export_mb
}

export_blocked if {
    input.operation == "export"
    input.sandbox_config.max_export_mb == 0
}

export_blocked if {
    input.operation == "export"
    input.external_export == true
    not input.sandbox_config.allow_external_exports
}

# ============================================================================
# Rate Limiting
# ============================================================================

rate_limit_exceeded if {
    input.operation_count >= input.sandbox_config.max_executions_per_hour
}

# ============================================================================
# Decision Outputs
# ============================================================================

# Main decision with detailed response
decision := result if {
    allow
    result := {
        "allowed": true,
        "reason": "Sandbox operation permitted",
        "tenant_id": input.sandbox_id,
        "data_filters": tenant_data_filters,
        "audit": should_audit
    }
}

decision := result if {
    not allow
    operation_blocked
    result := {
        "allowed": false,
        "reason": sprintf("Operation '%v' is blocked in sandbox", [input.operation]),
        "code": "SANDBOX_OPERATION_BLOCKED",
        "audit": true
    }
}

decision := result if {
    not allow
    connector_blocked
    result := {
        "allowed": false,
        "reason": sprintf("Connector '%v' is not allowed in sandbox", [input.connector_type]),
        "code": "SANDBOX_CONNECTOR_BLOCKED",
        "audit": true
    }
}

decision := result if {
    not allow
    pii_blocked
    result := {
        "allowed": false,
        "reason": "PII detected and blocked per sandbox policy",
        "code": "SANDBOX_PII_BLOCKED",
        "audit": true
    }
}

decision := result if {
    not allow
    rate_limit_exceeded
    result := {
        "allowed": false,
        "reason": "Rate limit exceeded for sandbox",
        "code": "SANDBOX_RATE_LIMIT",
        "audit": true
    }
}

# ============================================================================
# Data Filters
# ============================================================================

# Filters to apply to all sandbox queries
tenant_data_filters := filters if {
    is_sandbox_tenant
    filters := [
        {"field": "tenantId", "operator": "eq", "value": input.sandbox_id},
        {"field": "dataSource", "operator": "ne", "value": "production"}
    ]
}

# Additional filters based on data access mode
data_mode_filters := filters if {
    input.sandbox_config.data_access_mode == "synthetic_only"
    filters := [
        {"field": "dataSource", "operator": "eq", "value": "synthetic"}
    ]
}

# ============================================================================
# Audit Requirements
# ============================================================================

should_audit if {
    input.sandbox_config.audit_all_queries
}

should_audit if {
    input.sandbox_config.audit_all_mutations
    input.operation == "mutation"
}

should_audit if {
    input.operation == "export"
}

should_audit if {
    linkback_attempt
}

should_audit if {
    pii_detected
}

# ============================================================================
# Compliance Checks
# ============================================================================

compliance_check := result if {
    result := {
        "passed": not operation_blocked,
        "linkback_safe": not linkback_attempt,
        "pii_safe": not pii_detected,
        "isolation_valid": tenant_isolation_valid,
        "data_access_valid": data_access_valid
    }
}

# ============================================================================
# Sandbox Expiration Check
# ============================================================================

sandbox_expired if {
    input.sandbox_config.expires_at
    time.now_ns() > time.parse_rfc3339_ns(input.sandbox_config.expires_at)
}

deny_expired := result if {
    sandbox_expired
    result := {
        "allowed": false,
        "reason": "Sandbox has expired",
        "code": "SANDBOX_EXPIRED",
        "audit": true
    }
}

# ============================================================================
# Sandbox Status Check
# ============================================================================

sandbox_active if {
    input.sandbox_config.status == "active"
}

deny_inactive := result if {
    not sandbox_active
    result := {
        "allowed": false,
        "reason": sprintf("Sandbox is not active (status: %v)", [input.sandbox_config.status]),
        "code": "SANDBOX_NOT_ACTIVE",
        "audit": true
    }
}
