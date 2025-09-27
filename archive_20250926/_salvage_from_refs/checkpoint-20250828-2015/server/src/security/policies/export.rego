# IntelGraph Export Authorization Policies
# Enforces scoping, cross-tenant isolation, and reason-for-access requirements
package intelgraph.export

import rego.v1

# Default deny all exports unless explicitly allowed
default allow := false

# Default export scoping rules
default export_scope_valid := false

# Export is allowed if all conditions pass
allow if {
    has_valid_reason
    export_scope_valid
    cross_tenant_check_passes
    classification_level_authorized
    time_constraints_met
    rate_limits_not_exceeded
}

# Require reason-for-access for all export operations
has_valid_reason if {
    input.reason_for_access
    string.length(input.reason_for_access) >= 10
    not regex.match(`(?i)(test|testing|dummy|none|n/a|just because)`, input.reason_for_access)
}

# Validate export scope - users can only export data they have access to
export_scope_valid if {
    input.action == "export"
    input.resource.type == "investigation"
    investigation_access_authorized
}

export_scope_valid if {
    input.action == "export"
    input.resource.type == "case"
    case_access_authorized
}

export_scope_valid if {
    input.action == "export"
    input.resource.type == "entities"
    entities_access_authorized
}

export_scope_valid if {
    input.action == "export"
    input.resource.type == "audit_log"
    audit_access_authorized
}

# Investigation access rules
investigation_access_authorized if {
    # User is assigned to the investigation
    input.principal.id in input.resource.assigned_users
}

investigation_access_authorized if {
    # User has investigation read access and same tenant
    "investigation:read" in input.principal.permissions
    input.resource.tenant_id == input.principal.tenant_id
}

investigation_access_authorized if {
    # Admin users can access all investigations in their tenant
    "admin" in input.principal.roles
    input.resource.tenant_id == input.principal.tenant_id
}

# Case access rules
case_access_authorized if {
    # User is owner or collaborator on the case
    input.principal.id in input.resource.collaborators
}

case_access_authorized if {
    # User has case read access and same tenant
    "case:read" in input.principal.permissions
    input.resource.tenant_id == input.principal.tenant_id
}

case_access_authorized if {
    # Supervisor role can access team cases
    "supervisor" in input.principal.roles
    input.principal.team_id == input.resource.team_id
    input.resource.tenant_id == input.principal.tenant_id
}

# Entity access rules
entities_access_authorized if {
    # Check access to each entity being exported
    all_entities_accessible
}

all_entities_accessible if {
    count(input.resource.entity_ids) > 0
    count([entity_id | 
        entity_id := input.resource.entity_ids[_]
        entity_accessible(entity_id)
    ]) == count(input.resource.entity_ids)
}

entity_accessible(entity_id) if {
    entity := data.entities[entity_id]
    entity.tenant_id == input.principal.tenant_id
    
    # Entity visibility rules
    entity.visibility == "public"
}

entity_accessible(entity_id) if {
    entity := data.entities[entity_id]
    entity.tenant_id == input.principal.tenant_id
    entity.visibility == "restricted"
    
    # User has specific permission or is in allowed groups
    "entity:restricted_access" in input.principal.permissions
}

entity_accessible(entity_id) if {
    entity := data.entities[entity_id]
    entity.tenant_id == input.principal.tenant_id
    entity.visibility == "private"
    
    # User is owner or explicitly granted access
    entity.owner_id == input.principal.id
}

# Audit log access (highly restricted)
audit_access_authorized if {
    "audit:export" in input.principal.permissions
    input.resource.tenant_id == input.principal.tenant_id
    
    # Additional reason validation for audit exports
    audit_reason_valid
}

audit_reason_valid if {
    regex.match(`(?i)(compliance|audit|investigation|legal|security)`, input.reason_for_access)
}

# Cross-tenant access control
cross_tenant_check_passes if {
    input.resource.tenant_id == input.principal.tenant_id
}

cross_tenant_check_passes if {
    # Explicit cross-tenant access permission
    "cross_tenant_exporter" in input.principal.roles
    cross_tenant_reason_provided
}

cross_tenant_reason_provided if {
    regex.match(`(?i)(joint.?(investigation|operation)|multi.?tenant|cross.?tenant)`, input.reason_for_access)
}

# Classification level authorization
classification_level_authorized if {
    not input.resource.classification
}

classification_level_authorized if {
    input.resource.classification == "UNCLASSIFIED"
}

classification_level_authorized if {
    input.resource.classification == "CONFIDENTIAL"
    classification_clearance_sufficient("CONFIDENTIAL")
}

classification_level_authorized if {
    input.resource.classification == "SECRET"
    classification_clearance_sufficient("SECRET")
}

classification_level_authorized if {
    input.resource.classification == "TOP_SECRET"
    classification_clearance_sufficient("TOP_SECRET")
}

classification_clearance_sufficient(required_level) if {
    clearance_levels := ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP_SECRET"]
    user_level_index := indexof(clearance_levels, input.principal.security_clearance)
    required_level_index := indexof(clearance_levels, required_level)
    user_level_index >= required_level_index
}

# Time-based constraints
time_constraints_met if {
    not input.resource.time_restricted
}

time_constraints_met if {
    input.resource.time_restricted
    current_time := time.now_ns() / 1000000000  # Convert to seconds
    
    # Check if export is within allowed time window
    current_time >= input.resource.export_allowed_after
    current_time <= input.resource.export_allowed_before
}

# Rate limiting (prevent export abuse)
rate_limits_not_exceeded if {
    not rate_limit_exceeded
}

rate_limit_exceeded if {
    # Check recent export count for user
    recent_exports := data.export_history[input.principal.id].recent_count
    export_limit := export_rate_limit_for_user
    recent_exports >= export_limit
}

export_rate_limit_for_user := limit if {
    "high_volume_exporter" in input.principal.roles
    limit := 100  # per hour
}

export_rate_limit_for_user := limit if {
    "standard_user" in input.principal.roles
    limit := 20   # per hour
}

export_rate_limit_for_user := 5 if {
    # Default limit for unspecified roles
    true
}

# Violation reasons (for detailed error messages)
violation_reasons contains reason if {
    not has_valid_reason
    reason := "missing_or_invalid_reason_for_access"
}

violation_reasons contains reason if {
    not export_scope_valid
    reason := "insufficient_permissions_for_export_scope"
}

violation_reasons contains reason if {
    not cross_tenant_check_passes
    reason := "cross_tenant_access_denied"
}

violation_reasons contains reason if {
    not classification_level_authorized
    reason := "insufficient_security_clearance"
}

violation_reasons contains reason if {
    not time_constraints_met
    reason := "export_outside_allowed_time_window"
}

violation_reasons contains reason if {
    rate_limit_exceeded
    reason := "export_rate_limit_exceeded"
}

# Export format restrictions
format_allowed(format) if {
    format in ["JSON", "CSV", "PDF"]
    not restricted_format_requires_approval(format)
}

format_allowed(format) if {
    format in ["XML", "STIX", "MISP"]
    "advanced_formats" in input.principal.permissions
}

format_allowed(format) if {
    format == "RAW_DATABASE"
    "database_export" in input.principal.permissions
    input.reason_for_access
    regex.match(`(?i)(migration|backup|disaster.?recovery)`, input.reason_for_access)
}

restricted_format_requires_approval(format) if {
    format in ["PDF", "DOCX"]
    input.resource.classification in ["SECRET", "TOP_SECRET"]
    not approval_granted_for_export
}

approval_granted_for_export if {
    input.approval_id
    approval := data.export_approvals[input.approval_id]
    approval.status == "approved"
    approval.principal_id == input.principal.id
    approval.resource_id == input.resource.id
}

# Size limitations
export_size_within_limits if {
    not input.resource.estimated_size
}

export_size_within_limits if {
    input.resource.estimated_size <= size_limit_for_user
}

size_limit_for_user := limit if {
    "bulk_exporter" in input.principal.roles
    limit := 10737418240  # 10GB
}

size_limit_for_user := limit if {
    "standard_user" in input.principal.roles
    limit := 1073741824   # 1GB
}

size_limit_for_user := 104857600 if {
    # Default 100MB limit
    true
}

# Data retention compliance
retention_compliance_met if {
    not input.resource.retention_policy
}

retention_compliance_met if {
    input.resource.retention_policy
    current_time := time.now_ns() / 1000000000
    
    # Data hasn't exceeded retention period
    current_time <= input.resource.created_at + input.resource.retention_policy.max_age_seconds
}

# Export purpose validation
export_purpose_valid if {
    input.export_purpose
    input.export_purpose in valid_export_purposes
}

valid_export_purposes := [
    "investigation_analysis",
    "compliance_reporting", 
    "court_proceedings",
    "incident_response",
    "threat_intelligence",
    "training_exercise",
    "quality_assurance",
    "backup_recovery",
    "data_migration"
]

# Final export decision with detailed context
export_decision := {
    "allowed": allow,
    "scope_valid": export_scope_valid,
    "reason_provided": has_valid_reason,
    "cross_tenant_ok": cross_tenant_check_passes,
    "classification_ok": classification_level_authorized,
    "time_constraints_ok": time_constraints_met,
    "rate_limit_ok": rate_limits_not_exceeded,
    "format_allowed": format_allowed(input.export_format),
    "size_ok": export_size_within_limits,
    "retention_ok": retention_compliance_met,
    "purpose_valid": export_purpose_valid,
    "violations": violation_reasons
}