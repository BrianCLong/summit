# Conductor Data Access Policy
# Controls access to different data types based on sensitivity and tenant context

package conductor.data_access

import rego.v1

# Default deny
default allow := false

# Allow access if all data access rules are satisfied
allow if {
    tenant_access_check
    sensitivity_check
    role_authorization_check
    time_based_access_check
}

# Tenant access validation
tenant_access_check if {
    input.tenantId == data_tenant_id
}

tenant_access_check if {
    # Cross-tenant data sharing allowed for specific data types
    input.dataType in ["public_indicators", "shared_intelligence"]
    shared_data_authorized
}

# Sensitivity level authorization
sensitivity_check if {
    input.sensitivity == "public"
}

sensitivity_check if {
    input.sensitivity == "internal"
    input.role in ["user", "admin", "super_admin"]
}

sensitivity_check if {
    input.sensitivity == "confidential"
    input.role in ["admin", "super_admin"]
    business_justification_provided
}

sensitivity_check if {
    input.sensitivity == "restricted"
    input.role == "super_admin"
    dual_authorization_provided
    audit_trail_enabled
}

# Role-based authorization
role_authorization_check if {
    input.role == "super_admin"
}

role_authorization_check if {
    input.role == "admin"
    not restricted_admin_actions
}

role_authorization_check if {
    input.role == "user"
    user_authorized_actions
}

role_authorization_check if {
    input.role == "viewer"
    input.action == "read"
    not sensitive_data_type
}

# Time-based access control
time_based_access_check if {
    not time_restricted_data
}

time_based_access_check if {
    time_restricted_data
    current_time_allowed
}

# Helper rules
data_tenant_id := data.data_metadata[input.resource].tenantId

shared_data_authorized if {
    input.targetTenantId in data.data_sharing_agreements[data_tenant_id].authorizedTenants
}

business_justification_provided if {
    input.resourceAttributes.justification
    count(input.resourceAttributes.justification) > 10  # Minimum justification length
}

dual_authorization_provided if {
    input.resourceAttributes.secondaryAuthorizor
    input.resourceAttributes.secondaryAuthorizor != input.userId
}

audit_trail_enabled if {
    data.tenant_configs[input.tenantId].auditRequirements.realTimeAlerting == true
}

restricted_admin_actions if {
    input.action in ["delete", "export", "share_external"]
    input.dataType in ["investigation_data", "source_intelligence"]
}

user_authorized_actions if {
    input.action in ["read", "create", "update"]
    input.dataType not in ["system_config", "audit_logs", "user_management"]
}

sensitive_data_type if {
    input.dataType in ["investigation_data", "source_intelligence", "pii_data"]
}

time_restricted_data if {
    data.data_metadata[input.resource].accessRestrictions.timeRestricted == true
}

current_time_allowed if {
    time_restrictions := data.data_metadata[input.resource].accessRestrictions
    current_hour := time.weekday(time.now_ns())[1]
    current_hour >= time_restrictions.allowedHoursStart
    current_hour <= time_restrictions.allowedHoursEnd
}

# Data filtering rules
data_filters := {
    "tenant_scope": allowed_tenant_scope,
    "field_mask": field_mask,
    "row_level_filters": row_filters
} if allow

allowed_tenant_scope := [input.tenantId] if {
    not cross_tenant_authorized
}

allowed_tenant_scope := array.concat([input.tenantId], authorized_shared_tenants) if {
    cross_tenant_authorized
}

authorized_shared_tenants := data.data_sharing_agreements[input.tenantId].authorizedTenants

field_mask := [] if input.role == "super_admin"

field_mask := ["auditMetadata", "systemInternals"] if input.role == "admin"

field_mask := ["auditMetadata", "systemInternals", "investigationNotes"] if input.role == "user"

field_mask := ["auditMetadata", "systemInternals", "investigationNotes", "sourceDetails"] if input.role == "viewer"

row_filters := {
    "tenantId": input.tenantId,
    "sensitivity": allowed_sensitivity_levels,
    "dataClassification": allowed_classifications
}

allowed_sensitivity_levels := ["public", "internal", "confidential", "restricted"] if input.role == "super_admin"

allowed_sensitivity_levels := ["public", "internal", "confidential"] if input.role == "admin"

allowed_sensitivity_levels := ["public", "internal"] if input.role == "user"

allowed_sensitivity_levels := ["public"] if input.role == "viewer"

allowed_classifications := data.tenant_configs[input.tenantId].allowedDataClassifications[input.role]

cross_tenant_authorized if {
    input.targetTenantId
    input.targetTenantId in data.data_sharing_agreements[input.tenantId].authorizedTenants
}

# Audit requirements
audit_log := {
    "level": audit_level,
    "message": audit_message,
    "metadata": {
        "dataType": input.dataType,
        "sensitivity": input.sensitivity,
        "tenant": input.tenantId,
        "user": input.userId,
        "resource": input.resource,
        "businessJustification": input.resourceAttributes.justification
    }
}

audit_level := "error" if {
    not allow
    input.sensitivity in ["confidential", "restricted"]
}

audit_level := "warn" if {
    allow
    input.sensitivity == "restricted"
}

audit_level := "info"

audit_message := sprintf("Data access %s for %s data", [decision_text, input.sensitivity])

decision_text := "granted" if allow
decision_text := "denied"

# Tags for data governance
tags contains sprintf("tenant:%s", [input.tenantId])
tags contains sprintf("sensitivity:%s", [input.sensitivity])
tags contains sprintf("dataType:%s", [input.dataType])
tags contains sprintf("accessedBy:%s", [input.role])

tags contains "cross_tenant_access" if cross_tenant_authorized
tags contains "audit_required" if input.sensitivity in ["confidential", "restricted"]
tags contains "time_restricted" if time_restricted_data

# Conditions for access
conditions contains "audit_required" if input.sensitivity in ["confidential", "restricted"]
conditions contains "business_justification_required" if input.sensitivity == "confidential"
conditions contains "dual_authorization_required" if input.sensitivity == "restricted"
conditions contains "rate_limited" if input.role == "user"
conditions contains "monitoring_enhanced" if cross_tenant_authorized

# Reason for decision
reason := sprintf("Access granted for %s sensitivity data with %s role", [input.sensitivity, input.role]) if allow

reason := sprintf("Access denied: insufficient role '%s' for '%s' sensitivity data", [input.role, input.sensitivity]) if {
    not allow
    not sensitivity_check
}

reason := sprintf("Access denied: cross-tenant access not authorized for data type '%s'", [input.dataType]) if {
    not allow
    input.targetTenantId
    not shared_data_authorized
}

reason := sprintf("Access denied: time-based restriction active for resource '%s'", [input.resource]) if {
    not allow
    time_restricted_data
    not current_time_allowed
}

reason := "Access denied: business justification required for confidential data" if {
    not allow
    input.sensitivity == "confidential"
    not business_justification_provided
}

reason := "Access denied: dual authorization required for restricted data" if {
    not allow
    input.sensitivity == "restricted"
    not dual_authorization_provided
}