# Ingest Pipeline OPA Policies
#
# Enforces:
# - Tenant isolation
# - Schema versioning requirements
# - Replay/RFA authorization
# - Rate limiting guards
#
package ingest.policy

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Default deny
default allow := false
default replay_allowed := false
default schema_valid := false

# =============================================================================
# Tenant Isolation
# =============================================================================

# Ensure tenant_id is present and valid
tenant_valid if {
    input.tenant_id
    count(input.tenant_id) > 0
    count(input.tenant_id) <= 255
}

# Deny cross-tenant access
tenant_match if {
    input.requested_tenant == input.user_tenant
}

cross_tenant_allowed if {
    "admin" in input.user_roles
}

cross_tenant_allowed if {
    "cross_tenant_reader" in input.user_roles
    input.action == "read"
}

# Tenant isolation violation
deny[msg] if {
    not tenant_valid
    msg := "tenant_id is required and must be 1-255 characters"
}

deny[msg] if {
    input.requested_tenant
    input.user_tenant
    not tenant_match
    not cross_tenant_allowed
    msg := sprintf("cross-tenant access denied: user tenant '%s' cannot access tenant '%s'", [input.user_tenant, input.requested_tenant])
}

# =============================================================================
# Schema Versioning
# =============================================================================

# Valid schema version format
valid_schema_version(v) if {
    regex.match(`^[0-9]+\.[0-9]+\.[0-9]+$`, v)
}

schema_valid if {
    input.schema_version
    valid_schema_version(input.schema_version)
}

# Check for breaking schema changes
breaking_change if {
    input.schema_change_type == "remove_field"
}

breaking_change if {
    input.schema_change_type == "change_type"
}

breaking_change if {
    input.schema_change_type == "add_required"
}

deny[msg] if {
    breaking_change
    not input.migration_plan
    msg := "breaking schema change requires migration plan"
}

deny[msg] if {
    breaking_change
    not input.transformer_version
    msg := "breaking schema change requires transformer for backwards compatibility"
}

# =============================================================================
# Replay Authorization
# =============================================================================

# Replay requires RFA for large operations
rfa_required if {
    input.replay_records_estimate > 10000
}

rfa_required if {
    input.replay_duration_hours > 24
}

rfa_required if {
    input.replay_tenant_count > 1
}

replay_allowed if {
    input.replay_requested
    not rfa_required
    "ingest_operator" in input.user_roles
}

replay_allowed if {
    input.replay_requested
    rfa_required
    input.rfa_approved
    input.rfa_approver != input.user_id
}

deny[msg] if {
    input.replay_requested
    rfa_required
    not input.rfa_approved
    msg := sprintf("replay requires RFA approval (estimated %d records)", [input.replay_records_estimate])
}

deny[msg] if {
    input.replay_requested
    input.rfa_approved
    input.rfa_approver == input.user_id
    msg := "self-approval of RFA not allowed"
}

# =============================================================================
# Legal Hold and Purge
# =============================================================================

# Cannot replay/purge data under legal hold
deny[msg] if {
    input.replay_requested
    input.legal_hold_active
    msg := "cannot replay data under legal hold"
}

deny[msg] if {
    input.purge_requested
    input.legal_hold_active
    msg := "cannot purge data under legal hold"
}

# Purge requires additional authorization
purge_allowed if {
    input.purge_requested
    not input.legal_hold_active
    "data_admin" in input.user_roles
    input.purge_approved
}

deny[msg] if {
    input.purge_requested
    not purge_allowed
    msg := "purge requires data_admin role and explicit approval"
}

# =============================================================================
# Rate Limiting Guards
# =============================================================================

# Maximum allowed RPS per tenant
max_tenant_rps := 1000

# Maximum allowed replay throttle
max_replay_rps := 500

deny[msg] if {
    input.requested_rps > max_tenant_rps
    msg := sprintf("requested RPS %d exceeds maximum %d", [input.requested_rps, max_tenant_rps])
}

deny[msg] if {
    input.replay_requested
    input.replay_throttle_rps > max_replay_rps
    msg := sprintf("replay throttle %d exceeds maximum %d", [input.replay_throttle_rps, max_replay_rps])
}

# =============================================================================
# Sink Access Control
# =============================================================================

# Allowed sink types per role
allowed_sinks := {
    "ingest_operator": ["postgres", "neo4j", "typesense", "kafka"],
    "ingest_reader": [],
    "admin": ["postgres", "neo4j", "typesense", "kafka", "s3", "gcs"]
}

sink_allowed(sink_type, roles) if {
    some role in roles
    sink_type in allowed_sinks[role]
}

deny[msg] if {
    input.sink_type
    not sink_allowed(input.sink_type, input.user_roles)
    msg := sprintf("access to sink type '%s' not allowed for user roles", [input.sink_type])
}

# =============================================================================
# Main Decision
# =============================================================================

allow if {
    count(deny) == 0
    tenant_valid
}

# Decision with reasons
decision := {
    "allow": allow,
    "deny_reasons": deny,
    "replay_allowed": replay_allowed,
    "schema_valid": schema_valid,
    "rfa_required": rfa_required
}
