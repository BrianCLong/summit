# Conductor Cross-Tenant Operations Policy
# Governs inter-tenant data sharing and collaborative operations

package conductor.cross_tenant
import future.keywords.if
import future.keywords.in
import future.keywords.contains



# Default deny cross-tenant operations
default allow := false

# Allow cross-tenant operation if all conditions are met
allow if {
    cross_tenant_agreement_valid
    operation_authorized
    security_requirements_met
    audit_trail_configured
}

# Cross-tenant agreement validation
cross_tenant_agreement_valid if {
    # Check if source and target tenants have a valid agreement
    agreement_exists
    agreement_active
    operation_covered_by_agreement
}

agreement_exists if {
    data.cross_tenant_agreements[input.tenantId][input.targetTenantId]
}

agreement_active if {
    agreement := data.cross_tenant_agreements[input.tenantId][input.targetTenantId]
    agreement.status == "active"
    agreement.expiryDate > time.now_ns()
}

operation_covered_by_agreement if {
    agreement := data.cross_tenant_agreements[input.tenantId][input.targetTenantId]
    input.action in agreement.allowedOperations
    input.resource in agreement.allowedResources
}

# Operation authorization
operation_authorized if {
    role_authorized_for_cross_tenant
    data_classification_allows_sharing
    business_context_valid
}

role_authorized_for_cross_tenant if {
    input.role in ["admin", "super_admin"]
}

role_authorized_for_cross_tenant if {
    input.role == "user"
    input.businessContext.project
    project_allows_cross_tenant
}

data_classification_allows_sharing if {
    input.resourceAttributes.dataClassification in ["public", "internal"]
}

data_classification_allows_sharing if {
    input.resourceAttributes.dataClassification == "confidential"
    explicit_approval_provided
    legal_review_completed
}

business_context_valid if {
    input.businessContext.project
    input.businessContext.justification
    valid_business_purpose
}

# Security requirements
security_requirements_met if {
    encryption_requirements_met
    access_controls_enforced
    data_retention_aligned
}

encryption_requirements_met if {
    input.resourceAttributes.encrypted == true
}

encryption_requirements_met if {
    # Public data doesn't require encryption
    input.resourceAttributes.dataClassification == "public"
}

access_controls_enforced if {
    agreement := data.cross_tenant_agreements[input.tenantId][input.targetTenantId]
    agreement.securityControls.mfaRequired == false
}

access_controls_enforced if {
    agreement := data.cross_tenant_agreements[input.tenantId][input.targetTenantId]
    agreement.securityControls.mfaRequired == true
    input.sessionContext.mfaVerified == true
}

data_retention_aligned if {
    source_retention := data.tenant_configs[input.tenantId].retentionPolicy.defaultRetentionDays
    target_retention := data.tenant_configs[input.targetTenantId].retentionPolicy.defaultRetentionDays
    
    # Target retention should be equal or shorter than source
    target_retention <= source_retention
}

# Audit requirements
audit_trail_configured if {
    data.tenant_configs[input.tenantId].auditRequirements.logAllActions == true
    data.tenant_configs[input.targetTenantId].auditRequirements.logAllActions == true
}

# Helper rules
project_allows_cross_tenant if {
    project_config := data.project_configs[input.businessContext.project]
    input.targetTenantId in project_config.authorizedTenants
}

explicit_approval_provided if {
    input.resourceAttributes.approvals
    approval_valid(input.resourceAttributes.approvals[_])
}

approval_valid(approval) if {
    approval.role in ["admin", "super_admin", "legal"]
    approval.timestamp > (time.now_ns() - (7 * 24 * 60 * 60 * 1000000000))  # Within 7 days
}

legal_review_completed if {
    input.resourceAttributes.legalReview.status == "approved"
    input.resourceAttributes.legalReview.completedDate > (time.now_ns() - (30 * 24 * 60 * 60 * 1000000000))  # Within 30 days
}

valid_business_purpose if {
    business_purposes := ["intelligence_sharing", "joint_investigation", "threat_collaboration", "research_cooperation"]
    input.businessContext.purpose in business_purposes
}

# Data transformation requirements
data_filters := {
    "tenant_scope": [input.tenantId, input.targetTenantId],
    "field_mask": cross_tenant_field_mask,
    "row_level_filters": {
        "tenantId": [input.tenantId, input.targetTenantId],
        "sharedWithTenant": input.targetTenantId
    },
    "data_transformations": required_transformations
} if allow

cross_tenant_field_mask := [] if {
    input.resourceAttributes.dataClassification == "public"
}

cross_tenant_field_mask := ["internalNotes", "systemMetadata"] if {
    input.resourceAttributes.dataClassification == "internal"
}

cross_tenant_field_mask := ["internalNotes", "systemMetadata", "sourceDetails", "methodologyDetails"] if {
    input.resourceAttributes.dataClassification == "confidential"
}

required_transformations := [] if {
    input.resourceAttributes.dataClassification in ["public", "internal"]
}

required_transformations := ["anonymize_pii", "redact_sources"] if {
    input.resourceAttributes.dataClassification == "confidential"
}

# Tags for cross-tenant operations
tags contains sprintf("source_tenant:%s", [input.tenantId])
tags contains sprintf("target_tenant:%s", [input.targetTenantId])
tags contains sprintf("operation:%s", [input.action])
tags contains sprintf("project:%s", [input.businessContext.project])

tags contains "cross_tenant_sharing"
tags contains "audit_required"
tags contains "legal_reviewed" if legal_review_completed

# Conditions
conditions contains "audit_required"
conditions contains "retention_monitoring_required"
conditions contains "access_review_required" if {
    input.resourceAttributes.dataClassification == "confidential"
}

conditions contains "legal_notification_required" if {
    input.resourceAttributes.dataClassification == "confidential"
    not legal_review_completed
}

conditions contains "encryption_required" if {
    input.resourceAttributes.dataClassification != "public"
}

# Audit logging
audit_log := {
    "level": "warn",  # Cross-tenant operations always warrant attention
    "message": sprintf("Cross-tenant operation %s from %s to %s", [input.action, input.tenantId, input.targetTenantId]),
    "metadata": {
        "sourceTenant": input.tenantId,
        "targetTenant": input.targetTenantId,
        "user": input.userId,
        "operation": input.action,
        "resource": input.resource,
        "dataClassification": input.resourceAttributes.dataClassification,
        "businessJustification": input.businessContext.justification,
        "agreementId": data.cross_tenant_agreements[input.tenantId][input.targetTenantId].agreementId,
        "securityControls": data.cross_tenant_agreements[input.tenantId][input.targetTenantId].securityControls
    }
}

# Reason for decision
reason := sprintf("Cross-tenant operation authorized between %s and %s", [input.tenantId, input.targetTenantId]) if allow

reason := sprintf("No valid cross-tenant agreement between %s and %s", [input.tenantId, input.targetTenantId]) if {
    not allow
    not agreement_exists
}

reason := sprintf("Cross-tenant agreement expired or inactive between %s and %s", [input.tenantId, input.targetTenantId]) if {
    not allow
    agreement_exists
    not agreement_active
}

reason := sprintf("Operation '%s' not authorized by cross-tenant agreement", [input.action]) if {
    not allow
    agreement_active
    not operation_covered_by_agreement
}

reason := sprintf("Insufficient role '%s' for cross-tenant operations", [input.role]) if {
    not allow
    not role_authorized_for_cross_tenant
}

reason := sprintf("Data classification '%s' not permitted for cross-tenant sharing", [input.resourceAttributes.dataClassification]) if {
    not allow
    not data_classification_allows_sharing
}

reason := "Security requirements not met for cross-tenant operation" if {
    not allow
    operation_authorized
    not security_requirements_met
}

reason := "Audit trail not properly configured for cross-tenant operation" if {
    not allow
    security_requirements_met
    not audit_trail_configured
}
