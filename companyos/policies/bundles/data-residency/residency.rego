import future.keywords
# CompanyOS Identity Fabric - Data Residency Enforcement Policy
# Version: 1.0.0
#
# Enforces data residency requirements including:
# - Region access controls
# - Export restrictions
# - Sovereignty requirements
# - Cross-region data movement

package companyos.authz.residency

import rego.v1

# ============================================================================
# Default Deny
# ============================================================================

default allow := false
default region_access_valid := false
default export_allowed := false

# ============================================================================
# Main Authorization
# ============================================================================

allow if {
    region_access_valid
    not export_violation
    not sovereignty_violation
}

# ============================================================================
# Region Access Control
# ============================================================================

# Same region - always allowed
region_access_valid if {
    input.environment.region == input.tenant.residency.primary_region
}

# Allowed region for read operations
region_access_valid if {
    input.action == "read"
    input.environment.region in input.tenant.residency.allowed_regions
}

# Allowed region with export token
region_access_valid if {
    input.environment.region in input.tenant.residency.allowed_regions
    input.subject.has_export_token == true
    "export:create" in input.subject.permissions
}

# Standard tenants can access allowed regions
region_access_valid if {
    input.tenant.residency.class == "standard"
    input.environment.region in input.tenant.residency.allowed_regions
}

# ============================================================================
# Export Controls
# ============================================================================

export_allowed if {
    input.action != "export"
}

export_allowed if {
    input.action == "export"
    not input.tenant.residency.export_restrictions.requires_approval
    "export:create" in input.subject.permissions
}

export_allowed if {
    input.action == "export"
    input.tenant.residency.export_restrictions.requires_approval
    input.subject.has_export_token == true
    "export:admin" in input.subject.permissions
}

export_violation if {
    input.action == "export"
    not export_allowed
}

# Export destination restrictions
export_violation if {
    input.action == "export"
    input.request.export_destination
    not input.request.export_destination in input.tenant.residency.export_restrictions.allowed_destinations
}

# Export rate limiting
export_violation if {
    input.action == "export"
    input.subject.export_calls_today >= input.tenant.quotas.export_calls_per_day
}

# ============================================================================
# Sovereignty Requirements
# ============================================================================

# Sovereign tenants have strict restrictions
sovereignty_violation if {
    input.tenant.residency.class == "sovereign"
    input.action != "read"
    input.environment.region != input.tenant.residency.primary_region
    not input.subject.has_export_token
}

sovereignty_violation if {
    input.tenant.residency.class == "sovereign"
    input.action == "export"
    not input.request.export_destination in input.tenant.residency.sovereignty.allowed_export_destinations
}

# Restricted tenants need export token for cross-region
sovereignty_violation if {
    input.tenant.residency.class == "restricted"
    input.environment.region != input.tenant.residency.primary_region
    not input.subject.has_export_token
}

# ============================================================================
# Data Classification Residency
# ============================================================================

# Some classifications may have additional residency requirements
classification_residency_valid if {
    not input.resource.classification
}

classification_residency_valid if {
    input.resource.classification in input.tenant.residency.allowed_classifications
}

classification_residency_valid if {
    input.resource.classification in ["unclassified", "cui"]
}

# Sensitive data must stay in primary region
classification_residency_valid if {
    input.resource.classification in ["secret", "top-secret", "top-secret-sci"]
    input.environment.region == input.tenant.residency.primary_region
}

# ============================================================================
# Cross-Region Write Protection
# ============================================================================

cross_region_write_allowed if {
    input.action != "write"
}

cross_region_write_allowed if {
    input.action == "write"
    input.environment.region == input.tenant.residency.primary_region
}

cross_region_write_allowed if {
    input.action == "write"
    input.subject.has_export_token == true
    "export:admin" in input.subject.permissions
}

deny_cross_region_write if {
    input.action == "write"
    not cross_region_write_allowed
}

# ============================================================================
# Provenance Tracking Requirements
# ============================================================================

requires_provenance_tracking if {
    input.action in ["export", "write", "delete"]
    input.tenant.residency.class in ["restricted", "sovereign"]
}

requires_provenance_tracking if {
    input.resource.classification in ["secret", "top-secret", "top-secret-sci"]
}

# ============================================================================
# Decision Output
# ============================================================================

decision := {
    "allow": allow,
    "region_access_valid": region_access_valid,
    "export_allowed": export_allowed,
    "reason": reason,
    "obligations": obligations,
    "requires_provenance": requires_provenance_tracking
}

reason := "Access granted" if {
    allow
}

reason := "Region access denied" if {
    not region_access_valid
}

reason := "Export not allowed" if {
    export_violation
}

reason := "Sovereignty violation" if {
    sovereignty_violation
}

reason := "Cross-region write denied" if {
    deny_cross_region_write
}

obligations := obs if {
    allow
    obs := array.concat(provenance_obligations, audit_obligations)
}

provenance_obligations := [{
    "type": "provenance",
    "action": "track",
    "parameters": {
        "source_region": input.environment.region,
        "target_region": object.get(input.request, "export_destination", input.environment.region),
        "classification": input.resource.classification
    }
}] if {
    requires_provenance_tracking
}

provenance_obligations := [] if {
    not requires_provenance_tracking
}

audit_obligations := [{
    "type": "audit",
    "level": "full",
    "parameters": {
        "reason": "cross_region_access",
        "source_region": input.tenant.residency.primary_region,
        "access_region": input.environment.region
    }
}] if {
    input.environment.region != input.tenant.residency.primary_region
}

audit_obligations := [] if {
    input.environment.region == input.tenant.residency.primary_region
}

# ============================================================================
# Helper Functions
# ============================================================================

# Check if tenant can read from a specific region
can_read_from_region(region) if {
    region == input.tenant.residency.primary_region
}

can_read_from_region(region) if {
    region in input.tenant.residency.allowed_regions
    input.tenant.residency.class != "sovereign"
}

can_read_from_region(region) if {
    region in input.tenant.residency.allowed_regions
    input.tenant.residency.class == "sovereign"
    input.subject.has_export_token
}

# Check if tenant can write to a specific region
can_write_to_region(region) if {
    region == input.tenant.residency.primary_region
    "data:write" in input.subject.permissions
}

can_write_to_region(region) if {
    region in input.tenant.residency.allowed_regions
    input.subject.has_export_token
    "export:admin" in input.subject.permissions
}

# ============================================================================
# Policy Metadata
# ============================================================================

policy_metadata := {
    "version": "1.0.0",
    "name": "companyos-residency",
    "description": "Data Residency Enforcement for CompanyOS",
    "last_updated": "2025-01-01T00:00:00Z"
}
