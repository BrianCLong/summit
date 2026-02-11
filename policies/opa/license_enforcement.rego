# License Enforcement and Compatibility Policy
# Enforces data license restrictions and TOS compliance

package intelgraph.license

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# =============================================================================
# Main Decision Rules
# =============================================================================

# Default deny
default allow := false

# Main authorization decision
allow := {
  "allow": true,
  "reason": "Action permitted by license",
  "obligations": obligations,
  "conditions": conditions
} if {
  license_required
  valid_license
  license_permits_action
  not export_control_violation
  tos_accepted_if_required
}

# Allow if no license required
allow := {
  "allow": true,
  "reason": "No license restrictions apply",
  "obligations": [],
  "conditions": []
} if {
  not license_required
}

# Explicit denial reasons
deny contains msg if {
  license_required
  not input.context.licenseId
  not license_data
  msg := sprintf(
    "Action '%s' requires license compliance check but no license found for resource",
    [input.action]
  )
}

deny contains msg if {
  license_required
  license_data
  not valid_license
  msg := sprintf(
    "License '%s' is not active: status is '%s'",
    [license_data.licenseKey, license_data.status]
  )
}

deny contains msg if {
  license_required
  valid_license
  not license_permits_action
  msg := sprintf(
    "License '%s' does not permit action '%s'. %s",
    [license_data.licenseName, input.action, permission_explanation]
  )
}

deny contains msg if {
  license_required
  valid_license
  license_permits_action
  export_control_violation
  msg := sprintf(
    "Export control violation: %s",
    [export_control_reason]
  )
}

deny contains msg if {
  license_required
  tos_required
  not tos_accepted
  msg := sprintf(
    "Terms of Service acceptance required for license '%s'",
    [license_data.licenseName]
  )
}

# =============================================================================
# License Requirement Rules
# =============================================================================

# Actions that require license check
license_required if {
  input.action in [
    "EXPORT",
    "SHARE",
    "DISTRIBUTE",
    "DOWNLOAD",
    "MODIFY",
    "CREATE_DERIVATIVES"
  ]
}

# Context explicitly requires license check
license_required if {
  input.context.licenseRequired == true
}

# =============================================================================
# License Data and Validation
# =============================================================================

# License data from external source (database/cache in production)
license_data := input.context.license

# License exists
license_exists if {
  license_data
}

# License is valid (active and not expired)
valid_license if {
  license_exists
  license_data.status == "ACTIVE"
  not license_expired
}

# Check if license is expired
license_expired if {
  license_exists
  license_data.expiryDate
  time.parse_rfc3339_ns(license_data.expiryDate) < time.now_ns()
}

# =============================================================================
# License Permission Checks
# =============================================================================

# Map actions to license permissions
action_to_permission := {
  "READ": "read",
  "QUERY": "read",
  "VIEW": "read",
  "COPY": "copy",
  "DOWNLOAD": "copy",
  "MODIFY": "modify",
  "UPDATE": "modify",
  "EXPORT": "distribute",
  "SHARE": "distribute",
  "DISTRIBUTE": "distribute",
  "COMMERCIAL_USE": "commercialUse",
  "CREATE_DERIVATIVES": "createDerivatives"
}

# Get the permission key for the action
permission_key := action_to_permission[input.action] if {
  input.action in object.keys(action_to_permission)
}

# Check if license permits the action
license_permits_action if {
  license_exists
  permission_key
  license_data.permissions[permission_key] == true
}

# Generate explanation for permission denial
permission_explanation := msg if {
  license_exists
  permission_key
  license_data.permissions[permission_key] == false
  msg := sprintf(
    "Permission '%s' is denied by license. Contact data owner for authorization.",
    [permission_key]
  )
}

# =============================================================================
# License Restrictions
# =============================================================================

# Check attribution requirement
requires_attribution if {
  license_exists
  license_data.requiresAttribution == true
}

attribution_obligation := {
  "type": "ATTRIBUTION",
  "description": "Attribution required",
  "requirement": license_data.attributionText,
  "enforceAt": "DURING",
  "metadata": {
    "attributionText": license_data.attributionText
  }
} if requires_attribution

# Check share-alike requirement
requires_share_alike if {
  license_exists
  license_data.restrictions.shareAlike == true
  input.action in ["CREATE_DERIVATIVES", "MODIFY"]
}

share_alike_obligation := {
  "type": "SHARE_ALIKE",
  "description": "Derivative works must use same license",
  "requirement": sprintf(
    "Any derivatives must be licensed under %s",
    [license_data.licenseName]
  ),
  "enforceAt": "AFTER",
  "metadata": {
    "requiredLicense": license_data.licenseKey
  }
} if requires_share_alike

# Check non-commercial restriction
non_commercial_restriction if {
  license_exists
  license_data.restrictions.nonCommercial == true
}

# Deny commercial use if restricted
deny contains msg if {
  non_commercial_restriction
  input.action == "COMMERCIAL_USE"
  msg := sprintf(
    "License '%s' prohibits commercial use",
    [license_data.licenseName]
  )
}

# Check no-derivatives restriction
no_derivatives_restriction if {
  license_exists
  license_data.restrictions.noDerivatives == true
}

deny contains msg if {
  no_derivatives_restriction
  input.action in ["CREATE_DERIVATIVES", "MODIFY"]
  msg := sprintf(
    "License '%s' prohibits creation of derivative works",
    [license_data.licenseName]
  )
}

# Check notice requirement
requires_notice if {
  license_exists
  license_data.requiresNotice == true
}

notice_obligation := {
  "type": "NOTICE",
  "description": "Legal notice required",
  "requirement": license_data.noticeText,
  "enforceAt": "BEFORE",
  "metadata": {
    "noticeText": license_data.noticeText
  }
} if requires_notice

# =============================================================================
# Export Control
# =============================================================================

# Check if data is export controlled
export_controlled if {
  license_exists
  license_data.exportControlled == true
}

# Check for export control violations
export_control_violation if {
  export_controlled
  input.action in ["EXPORT", "SHARE", "DISTRIBUTE"]
  violates_country_restrictions
}

# Check country restrictions
violates_country_restrictions if {
  export_controlled
  license_data.prohibitedCountries
  input.subject.residency in license_data.prohibitedCountries
}

violates_country_restrictions if {
  export_controlled
  license_data.permittedCountries
  not input.subject.residency in license_data.permittedCountries
}

export_control_reason := msg if {
  violates_country_restrictions
  license_data.prohibitedCountries
  input.subject.residency in license_data.prohibitedCountries
  msg := sprintf(
    "Export to %s is prohibited by license",
    [input.subject.residency]
  )
}

export_control_reason := msg if {
  violates_country_restrictions
  license_data.permittedCountries
  not input.subject.residency in license_data.permittedCountries
  msg := sprintf(
    "Export only permitted to: %s",
    [concat(", ", license_data.permittedCountries)]
  )
}

export_control_condition := {
  "type": "EXPORT_CONTROL",
  "description": "Subject to export control regulations",
  "requirement": sprintf(
    "Export controlled under %s",
    [license_data.exportControlClassification]
  ),
  "metadata": {
    "classification": license_data.exportControlClassification,
    "permittedCountries": license_data.permittedCountries,
    "prohibitedCountries": license_data.prohibitedCountries
  }
} if export_controlled

# =============================================================================
# TOS Acceptance
# =============================================================================

# Check if TOS acceptance required
tos_required if {
  license_exists
  license_data.requiresSignature == true
}

tos_required if {
  license_exists
  license_data.licenseType in ["CUSTOM", "PROPIN"]
}

# Check if TOS accepted
tos_accepted if {
  input.context.tosAccepted == true
}

# TOS not required
tos_accepted if {
  not tos_required
}

# =============================================================================
# License Type-Specific Rules
# =============================================================================

# INTERNAL_ONLY - cannot be shared externally
internal_only if {
  license_exists
  license_data.licenseType == "INTERNAL_ONLY"
}

deny contains msg if {
  internal_only
  input.action in ["EXPORT", "SHARE", "DISTRIBUTE"]
  # Check if sharing outside organization
  input.context.external == true
  msg := "Data is for internal use only and cannot be shared externally"
}

# ORCON - Originator Controlled
orcon if {
  license_exists
  license_data.licenseType == "ORCON"
}

orcon_condition := {
  "type": "ORCON",
  "description": "Originator Controlled Release",
  "requirement": "Data can only be released with originator approval",
  "metadata": {
    "originator": license_data.metadata.originator
  }
} if orcon

# NOFORN - No Foreign Nationals
noforn if {
  license_exists
  license_data.licenseType == "NOFORN"
}

deny contains msg if {
  noforn
  input.subject.residency
  input.subject.residency != "US"
  msg := "Data marked NOFORN - no access for foreign nationals"
}

# =============================================================================
# License Compatibility (for derivative works)
# =============================================================================

# Check if combining data from multiple licenses
multiple_licenses if {
  input.action == "CREATE_DERIVATIVES"
  count(input.context.sourceLicenses) > 1
}

# Check compatibility between licenses
licenses_compatible if {
  multiple_licenses
  # In production, this would query the license_compatibility_matrix
  all_combinations_compatible
}

all_combinations_compatible if {
  # Simplified check - in production would check each pair
  not incompatible_license_types
}

incompatible_license_types if {
  multiple_licenses
  has_share_alike := [l | l := input.context.sourceLicenses[_]; l.restrictions.shareAlike]
  count(has_share_alike) > 0
  # If one license is share-alike, all must be compatible
  not all_same_license_family
}

all_same_license_family if {
  multiple_licenses
  families := [l.licenseFamily | l := input.context.sourceLicenses[_]]
  count({f | f := families[_]}) == 1
}

deny contains msg if {
  multiple_licenses
  not licenses_compatible
  msg := "Source data licenses are incompatible. Cannot create derivative work."
}

# =============================================================================
# Obligations and Conditions
# =============================================================================

# Collect all obligations
obligations := array.concat(
  array.concat(
    attribution_obligations,
    share_alike_obligations
  ),
  notice_obligations
) if license_exists

obligations := [] if not license_exists

attribution_obligations := [attribution_obligation] if requires_attribution else := []
share_alike_obligations := [share_alike_obligation] if requires_share_alike else := []
notice_obligations := [notice_obligation] if requires_notice else := []

# Collect all conditions
conditions := array.concat(
  export_control_conditions,
  orcon_conditions
) if license_exists

conditions := [] if not license_exists

export_control_conditions := [export_control_condition] if export_controlled else := []
orcon_conditions := [orcon_condition] if orcon else := []

# =============================================================================
# License Metadata for Audit
# =============================================================================

license_metadata := {
  "licenseId": license_data.licenseId,
  "licenseKey": license_data.licenseKey,
  "licenseName": license_data.licenseName,
  "licenseType": license_data.licenseType,
  "permissions": license_data.permissions,
  "restrictions": license_data.restrictions
} if license_exists

# =============================================================================
# Appeal Information
# =============================================================================

appeal_info := {
  "appealable": true,
  "process": "Contact data owner to request license modification or exemption",
  "contact": license_data.metadata.ownerContact,
  "required_documentation": [
    "Justification for access",
    "Intended use description",
    "Data handling procedures"
  ]
} if {
  license_required
  not license_permits_action
}
