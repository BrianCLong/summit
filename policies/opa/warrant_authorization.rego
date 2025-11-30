# Warrant-Based Authorization Policy
# Enforces legal authority requirements for sensitive actions

package intelgraph.warrant

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# =============================================================================
# Main Decision Rules
# =============================================================================

# Default deny - explicit authorization required
default allow := false

# Main authorization decision
allow := {
  "allow": true,
  "reason": "Access granted with valid warrant",
  "obligations": obligations
} if {
  warrant_required
  valid_warrant
  warrant_permits_action
  warrant_covers_resource
  not warrant_expired
  no_geographic_restrictions
}

# Allow without warrant if action doesn't require it
allow := {
  "allow": true,
  "reason": "No warrant required for this action",
  "obligations": []
} if {
  not warrant_required
}

# Explicit denial reasons
deny contains msg if {
  warrant_required
  not input.context.warrantId
  msg := sprintf(
    "Action '%s' requires a warrant. Please provide valid legal authorization.",
    [input.action]
  )
}

deny contains msg if {
  warrant_required
  input.context.warrantId
  not valid_warrant
  msg := sprintf(
    "Warrant '%s' is not valid: status is '%s'",
    [input.context.warrantId, warrant_status]
  )
}

deny contains msg if {
  warrant_required
  input.context.warrantId
  valid_warrant
  not warrant_permits_action
  msg := sprintf(
    "Warrant does not permit action '%s'. Permitted actions: %s",
    [input.action, concat(", ", warrant_data.permittedActions)]
  )
}

deny contains msg if {
  warrant_required
  input.context.warrantId
  valid_warrant
  warrant_expired
  msg := sprintf(
    "Warrant expired on %s",
    [warrant_data.expiryDate]
  )
}

deny contains msg if {
  warrant_required
  input.context.warrantId
  valid_warrant
  has_geographic_restrictions
  msg := sprintf(
    "Geographic restrictions prevent access: %s",
    [geographic_restriction_reason]
  )
}

# =============================================================================
# Warrant Requirement Rules
# =============================================================================

# Actions that always require warrants
warrant_required if {
  input.action in [
    "EXPORT",
    "SHARE",
    "DISTRIBUTE",
    "COPILOT"
  ]
}

# Export of classified data requires warrant
warrant_required if {
  input.action == "EXPORT"
  input.resource.classification in [
    "CONFIDENTIAL",
    "SECRET",
    "TOP_SECRET"
  ]
}

# Queries targeting specific subjects may require warrant
warrant_required if {
  input.action == "QUERY"
  count(input.resource.targetSubjects) > 0
}

# Context explicitly requires warrant
warrant_required if {
  input.context.warrantRequired == true
}

# =============================================================================
# Warrant Validation Rules
# =============================================================================

# Warrant data from external source (would come from database/cache in production)
# This is a mock - in production, OPA would receive warrant data in input
warrant_data := input.context.warrant

# Warrant exists and is provided
warrant_exists if {
  input.context.warrantId
  warrant_data
}

# Warrant has valid status
valid_warrant if {
  warrant_exists
  warrant_data.status in ["ACTIVE", "PENDING"]
}

warrant_status := warrant_data.status if {
  warrant_data
} else := "NOT_PROVIDED"

# =============================================================================
# Warrant Scope Validation
# =============================================================================

# Check if warrant permits the requested action
warrant_permits_action if {
  warrant_exists
  input.action in warrant_data.permittedActions
}

# Check if warrant covers the resource type
warrant_covers_resource if {
  warrant_exists
  # If no target data types specified, warrant covers all
  not warrant_data.targetDataTypes
}

warrant_covers_resource if {
  warrant_exists
  warrant_data.targetDataTypes
  input.resource.type in warrant_data.targetDataTypes
}

# Check if warrant covers specific subjects (if applicable)
warrant_covers_subject if {
  warrant_exists
  # If no target subjects specified, warrant covers all
  not warrant_data.targetSubjects
}

warrant_covers_subject if {
  warrant_exists
  warrant_data.targetSubjects
  input.resource.id in warrant_data.targetSubjects
}

# =============================================================================
# Temporal Validation
# =============================================================================

# Check if warrant is expired
warrant_expired if {
  warrant_exists
  warrant_data.expiryDate
  time.parse_rfc3339_ns(warrant_data.expiryDate) < time.now_ns()
}

# Check if warrant is not yet effective
warrant_not_yet_effective if {
  warrant_exists
  warrant_data.effectiveDate
  time.parse_rfc3339_ns(warrant_data.effectiveDate) > time.now_ns()
}

# =============================================================================
# Geographic Restrictions
# =============================================================================

# Check geographic restrictions
has_geographic_restrictions if {
  warrant_exists
  warrant_data.geographicScope
  count(warrant_data.geographicScope) > 0
}

geographic_restriction_reason := msg if {
  has_geographic_restrictions
  not user_in_permitted_geography
  msg := sprintf(
    "Access only permitted from: %s",
    [concat(", ", warrant_data.geographicScope)]
  )
}

# User is in permitted geography (would need to check IP geolocation in production)
user_in_permitted_geography if {
  has_geographic_restrictions
  # This is a simplified check - in production would use IP geolocation
  input.subject.residency in warrant_data.geographicScope
}

# No geographic restrictions
no_geographic_restrictions if {
  not has_geographic_restrictions
}

no_geographic_restrictions if {
  user_in_permitted_geography
}

# =============================================================================
# Warrant Type-Specific Rules
# =============================================================================

# Emergency warrants have shorter validity and require additional logging
emergency_warrant if {
  warrant_exists
  warrant_data.warrantType == "EMERGENCY"
}

# Emergency warrants impose additional obligations
emergency_warrant_obligations := [
  {
    "type": "EMERGENCY_JUSTIFICATION",
    "description": "Emergency warrant usage requires detailed justification",
    "requirement": "Provide emergency justification in audit log",
    "enforceAt": "DURING"
  },
  {
    "type": "SUPERVISOR_NOTIFICATION",
    "description": "Emergency warrant usage triggers supervisor notification",
    "requirement": "Supervisor will be notified of this access",
    "enforceAt": "AFTER"
  }
] if emergency_warrant

# Subpoenas may have specific compliance requirements
subpoena_warrant if {
  warrant_exists
  warrant_data.warrantType == "SUBPOENA"
}

subpoena_obligations := [
  {
    "type": "LEGAL_HOLD",
    "description": "Data accessed under subpoena is subject to legal hold",
    "requirement": "Do not delete or modify accessed data",
    "enforceAt": "AFTER"
  }
] if subpoena_warrant

# Court orders require strict audit trail
court_order_warrant if {
  warrant_exists
  warrant_data.warrantType == "COURT_ORDER"
}

court_order_obligations := [
  {
    "type": "ENHANCED_AUDIT",
    "description": "Court order requires enhanced audit logging",
    "requirement": "All actions will be logged with full context",
    "enforceAt": "DURING"
  }
] if court_order_warrant

# =============================================================================
# Obligations
# =============================================================================

# Collect all obligations based on warrant type and conditions
obligations := array.concat(
  array.concat(
    emergency_obligations,
    subpoena_obligations
  ),
  court_order_obligations
) if {
  warrant_exists
}

obligations := [] if {
  not warrant_exists
}

emergency_obligations := emergency_warrant_obligations if {
  emergency_warrant
} else := []

subpoena_obligations := subpoena_warrant_obligations if {
  subpoena_warrant
} else := []

court_order_obligations := court_order_obligations if {
  court_order_warrant
} else := []

# =============================================================================
# Warrant Metadata and Audit Support
# =============================================================================

# Provide warrant metadata for audit logging
warrant_metadata := {
  "warrantId": warrant_data.warrantId,
  "warrantNumber": warrant_data.warrantNumber,
  "warrantType": warrant_data.warrantType,
  "issuingAuthority": warrant_data.issuingAuthority,
  "jurisdiction": warrant_data.jurisdiction,
  "caseNumber": warrant_data.caseNumber
} if warrant_exists

# =============================================================================
# Two-Person Rule Enforcement
# =============================================================================

# Some warrants require two-person authorization
requires_two_person if {
  warrant_exists
  warrant_data.requiresTwoPerson == true
}

second_approver_present if {
  requires_two_person
  input.context.secondApproverId
  input.context.secondApproverId != input.subject.id
}

deny contains msg if {
  requires_two_person
  not second_approver_present
  msg := "This warrant requires two-person authorization. Second approver must be present."
}

# =============================================================================
# Appeal Process Information
# =============================================================================

# Provide appeal information for denied requests
appeal_info := {
  "appealable": true,
  "process": "Contact your legal team to request warrant authorization",
  "contact": "legal@intelgraph.example.com",
  "required_documentation": [
    "Justification for access",
    "Legal basis for warrant request",
    "Supervisor approval"
  ]
} if {
  warrant_required
  not valid_warrant
}
