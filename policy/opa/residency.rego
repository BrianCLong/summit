import future.keywords.in
import future.keywords.if
# Maestro Conductor v24.3.0 - Data Residency and Region Access Policies
# Epic E13: Residency, Export & Provenance

package maestro.residency

import rego.v1

# Default deny - require explicit authorization
default allow := false

# Allow if all residency checks pass
allow if {
    valid_region_access
    valid_data_classification
    valid_operation_type
    audit_access_attempt
}

# Check if the user can access data in the target region
valid_region_access if {
    input.tenant.residency.region == input.request.region
}

valid_region_access if {
    input.request.region in input.tenant.residency.allowedRegions
    input.request.operation == "read"
}

valid_region_access if {
    input.request.hasExportToken
    "export" in input.user.permissions
    input.request.region in input.tenant.residency.allowedRegions
}

# Sovereign tenants have strict region restrictions
valid_region_access if {
    input.tenant.residency.class != "sovereign"
    input.request.region in input.tenant.residency.allowedRegions
}

# Check data classification access
valid_data_classification if {
    count(input.request.dataClassifications) == 0
}

valid_data_classification if {
    all_classifications_allowed
}

all_classifications_allowed if {
    every classification in input.request.dataClassifications {
        classification in input.tenant.residency.dataClassification
    }
}

# Check operation type permissions
valid_operation_type if {
    input.request.operation == "read"
    "investigations:read" in input.user.permissions
}

valid_operation_type if {
    input.request.operation == "write"
    input.tenant.residency.region == input.request.region
    "investigations:write" in input.user.permissions
}

valid_operation_type if {
    input.request.operation == "export"
    valid_export_permissions
}

valid_export_permissions if {
    "export:create" in input.user.permissions
    not input.tenant.residency.exportRestrictions.requiresApproval
}

valid_export_permissions if {
    "export:admin" in input.user.permissions
    input.request.hasExportToken
}

# Cross-region write restrictions
deny_cross_region_write contains msg if {
    input.request.operation == "write"
    input.tenant.residency.region != input.request.region
    not input.request.hasExportToken
    msg := sprintf("Cross-region write denied: tenant region %s, request region %s", [
        input.tenant.residency.region,
        input.request.region
    ])
}

# Sovereign tenant restrictions
deny_sovereign_violations contains msg if {
    input.tenant.residency.class == "sovereign"
    input.request.operation != "read"
    not input.request.hasExportToken
    msg := sprintf("Sovereign tenant %s: operation %s requires export authorization", [
        input.tenant.tenantId,
        input.request.operation
    ])
}

# Export destination restrictions
deny_export_destination contains msg if {
    input.request.operation == "export"
    input.request.exportDestination
    not input.request.exportDestination in input.tenant.residency.exportRestrictions.allowedDestinations
    msg := sprintf("Export to %s not allowed for tenant %s", [
        input.request.exportDestination,
        input.tenant.tenantId
    ])
}

# Data classification violations
deny_classification_access contains msg if {
    some classification in input.request.dataClassifications
    not classification in input.tenant.residency.dataClassification
    msg := sprintf("Access denied: tenant lacks clearance for classification %s", [classification])
}

# Rate limiting for cross-region operations
deny_rate_limit contains msg if {
    input.request.operation == "export"
    input.request.exportCallsToday >= input.tenant.quotas.exportCallsPerDay
    msg := sprintf("Export rate limit exceeded: %d/%d calls used today", [
        input.request.exportCallsToday,
        input.tenant.quotas.exportCallsPerDay
    ])
}

# Audit logging function
audit_access_attempt if {
    print("AUDIT: Access attempt by", input.user.userId, "for tenant", input.tenant.tenantId, 
          "operation", input.request.operation, "region", input.request.region)
    true
}

# Helper rules for specific scenarios

# Check if tenant can read from a specific region
can_read_from_region(region) if {
    region == input.tenant.residency.region
}

can_read_from_region(region) if {
    region in input.tenant.residency.allowedRegions
    input.tenant.residency.class != "sovereign"
}

can_read_from_region(region) if {
    region in input.tenant.residency.allowedRegions
    input.tenant.residency.class == "sovereign"
    input.request.hasExportToken
}

# Check if tenant can write to a specific region
can_write_to_region(region) if {
    region == input.tenant.residency.region
    "investigations:write" in input.user.permissions
}

can_write_to_region(region) if {
    region in input.tenant.residency.allowedRegions
    input.request.hasExportToken
    "export:admin" in input.user.permissions
}

# Check if export is allowed to destination
can_export_to_destination(destination) if {
    destination in input.tenant.residency.exportRestrictions.allowedDestinations
    "export:create" in input.user.permissions
}

can_export_to_destination(destination) if {
    "export:admin" in input.user.permissions
    input.request.hasExportToken
}

# Detailed denial reasons for debugging
denial_reasons contains reason if {
    not valid_region_access
    reason := "Region access denied"
}

denial_reasons contains reason if {
    not valid_data_classification
    reason := "Data classification access denied"
}

denial_reasons contains reason if {
    not valid_operation_type
    reason := "Operation type not permitted"
}

denial_reasons contains reason if {
    count(deny_cross_region_write) > 0
    reason := "Cross-region write denied"
}

denial_reasons contains reason if {
    count(deny_sovereign_violations) > 0
    reason := "Sovereign tenant violation"
}

denial_reasons contains reason if {
    count(deny_export_destination) > 0
    reason := "Export destination not allowed"
}

denial_reasons contains reason if {
    count(deny_classification_access) > 0
    reason := "Data classification violation"
}

denial_reasons contains reason if {
    count(deny_rate_limit) > 0
    reason := "Rate limit exceeded"
}

# Export manifest validation
validate_export_manifest(manifest) if {
    required_fields := {
        "tenantId", "region", "purpose", "timestamp", 
        "dataClassifications", "exportedBy", "signature"
    }
    
    every field in required_fields {
        field in manifest
    }
    
    manifest.tenantId == input.tenant.tenantId
    manifest.region in input.tenant.residency.allowedRegions
    manifest.purpose in {"legal_compliance", "data_migration", "analytics", "backup"}
}

# Provenance chain validation
validate_provenance_chain(chain) if {
    count(chain) > 0
    every entry in chain {
        entry.timestamp
        entry.action
        entry.actor
        entry.region
    }
    
    # Chain must be chronologically ordered
    is_chronological(chain)
}

is_chronological(chain) if {
    count(chain) <= 1
}

is_chronological(chain) if {
    count(chain) > 1
    every i in numbers.range(0, count(chain) - 2) {
        chain[i].timestamp <= chain[i + 1].timestamp
    }
}