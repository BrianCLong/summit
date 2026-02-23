# ============================================================================
# IntelGraph ABAC Authorization Policy
# Main allow policy that orchestrates all authorization checks
# ============================================================================

package intelgraph.abac

import future.keywords.in

# ============================================================================
# MAIN AUTHORIZATION DECISION
# ============================================================================

# Default deny
default allow = false

# Allow if all checks pass
allow {
  tenant_isolation_check
  rbac_permission_check
  policy_tag_check
  warrant_validation_check
  purpose_limitation_check
  data_residency_check
}

# ============================================================================
# TENANT ISOLATION
# ============================================================================

tenant_isolation_check {
  input.user.tenant == input.resource.tenant
}

tenant_isolation_check {
  # Allow cross-tenant access for super admins
  "super_admin" in input.user.roles
}

# ============================================================================
# RBAC PERMISSION CHECK
# ============================================================================

rbac_permission_check {
  has_permission(input.user.roles, input.resource.type, input.operation_type)
}

has_permission(roles, resource_type, operation) {
  some role in roles
  role == "admin"  # Admin has all permissions
}

has_permission(roles, resource_type, operation) {
  some role in roles
  permission := concat(":", [resource_type, operation])
  permission in data.rbac.role_permissions[role]
}

has_permission(roles, resource_type, operation) {
  some role in roles
  wildcard := concat(":", [resource_type, "*"])
  wildcard in data.rbac.role_permissions[role]
}

has_permission(roles, _, _) {
  "*" in roles
}

# ============================================================================
# POLICY TAG VALIDATION
# ============================================================================

policy_tag_check {
  resource_sensitivity_allowed
  legal_basis_valid
  purpose_alignment_valid
}

# Check if user has required clearance for resource sensitivity
resource_sensitivity_allowed {
  not input.resource.policy_sensitivity
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "public"
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "internal"
  input.user.clearance_levels
  "internal" in input.user.clearance_levels
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "confidential"
  input.user.clearance_levels
  "confidential" in input.user.clearance_levels
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "restricted"
  input.user.clearance_levels
  "restricted" in input.user.clearance_levels
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "top_secret"
  input.user.clearance_levels
  "top_secret" in input.user.clearance_levels
}

# Validate that resource has a valid legal basis
legal_basis_valid {
  not input.resource.policy_legal_basis
}

legal_basis_valid {
  count(input.resource.policy_legal_basis) > 0
  valid_legal_bases := {"investigation", "court_order", "consent", "legitimate_interest", "legal_obligation", "public_interest"}
  some basis in input.resource.policy_legal_basis
  basis in valid_legal_bases
}

# Check if request purpose aligns with resource purposes
purpose_alignment_valid {
  not input.resource.policy_purpose
}

purpose_alignment_valid {
  count(input.resource.policy_purpose) == 0
}

purpose_alignment_valid {
  input.context.purposes
  some resource_purpose in input.resource.policy_purpose
  some request_purpose in input.context.purposes
  resource_purpose == request_purpose
}

# Allow if user has wildcard purpose scope
purpose_alignment_valid {
  "purpose:*" in input.user.scopes
}

# ============================================================================
# WARRANT VALIDATION
# ============================================================================

warrant_validation_check {
  not requires_warrant
}

warrant_validation_check {
  requires_warrant
  input.context.warrant_id
  warrant_is_valid
}

# Determine if warrant is required
requires_warrant {
  input.resource.policy_sensitivity in {"restricted", "top_secret"}
}

requires_warrant {
  "court_order" in input.resource.policy_legal_basis
}

requires_warrant {
  input.operation_type == "export"
  input.resource.policy_data_classification == "pii"
}

requires_warrant {
  input.operation_type == "export"
  input.resource.policy_sensitivity in {"confidential", "restricted", "top_secret"}
}

# Check if provided warrant is valid (simplified - actual validation done in WarrantService)
warrant_is_valid {
  input.context.warrant_id
  # In production, this would call out to warrant service
  # For now, trust that warrant_id presence means it was pre-validated
  true
}

# ============================================================================
# PURPOSE LIMITATION
# ============================================================================

purpose_limitation_check {
  input.context.purpose
  purpose_allowed_logic(input.context.purpose, input.operation_type)
}

purpose_allowed_logic(purpose, operation) {
  # Allow specific purpose/operation combinations
  valid_combinations := {
    {"purpose": "investigation", "operations": {"read", "write", "export"}},
    {"purpose": "threat_intel", "operations": {"read"}},
    {"purpose": "compliance", "operations": {"read", "export"}},
    {"purpose": "audit", "operations": {"read"}},
    {"purpose": "incident_response", "operations": {"read", "write"}},
    {"purpose": "training", "operations": {"read"}},
    {"purpose": "analytics", "operations": {"read"}},
    {"purpose": "maintenance", "operations": {"read"}},
  }

  some combo in valid_combinations
  combo.purpose == purpose
  operation in combo.operations
}

# ============================================================================
# DATA RESIDENCY
# ============================================================================

data_residency_check {
  not input.resource.policy_jurisdiction
}

data_residency_check {
  input.resource.policy_jurisdiction == input.user.residency
}

# Allow US users to access US data
data_residency_check {
  input.resource.policy_jurisdiction == "US"
  input.user.residency == "US"
}

# Allow if user has global data access scope
data_residency_check {
  "scope:global_data" in input.user.scopes
}

# ============================================================================
# DENY REASONS (for audit and user feedback)
# ============================================================================

deny_reasons[msg] {
  not tenant_isolation_check
  msg := "tenant_isolation_violation"
}

deny_reasons[msg] {
  not rbac_permission_check
  msg := "insufficient_rbac_permissions"
}

deny_reasons[msg] {
  not resource_sensitivity_allowed
  msg := "insufficient_clearance"
}

deny_reasons[msg] {
  not legal_basis_valid
  msg := "invalid_legal_basis"
}

deny_reasons[msg] {
  not purpose_alignment_valid
  msg := "purpose_mismatch"
}

deny_reasons[msg] {
  requires_warrant
  not input.context.warrant_id
  msg := "warrant_required"
}

deny_reasons[msg] {
  requires_warrant
  input.context.warrant_id
  not warrant_is_valid
  msg := "invalid_warrant"
}

deny_reasons[msg] {
  not purpose_limitation_check
  msg := "purpose_not_allowed"
}

deny_reasons[msg] {
  not data_residency_check
  msg := "jurisdiction_mismatch"
}

# ============================================================================
# FIELD-LEVEL REDACTIONS
# ============================================================================

redact_fields[field_name] {
  # Redact PII fields if user doesn't have PII scope
  input.resource.policy_pii_flags
  not "scope:pii" in input.user.scopes
  field_name := "email"
  input.resource.policy_pii_flags.has_emails == true
}

redact_fields[field_name] {
  input.resource.policy_pii_flags
  not "scope:pii" in input.user.scopes
  field_name := "phone"
  input.resource.policy_pii_flags.has_phones == true
}

redact_fields[field_name] {
  input.resource.policy_pii_flags
  not "scope:pii" in input.user.scopes
  field_name := "ssn"
  input.resource.policy_pii_flags.has_ssn == true
}

redact_fields[field_name] {
  input.resource.policy_pii_flags
  not "scope:pii" in input.user.scopes
  field_name := "address"
  input.resource.policy_pii_flags.has_addresses == true
}

# Redact sensitive fields based on clearance
redact_fields[field_name] {
  input.resource.policy_sensitivity == "restricted"
  not "restricted" in input.user.clearance_levels
  sensitive_fields := {"intelligence_source", "classified_notes", "source_identity"}
  some field_name in sensitive_fields
}

# ============================================================================
# HELPERS
# ============================================================================

# Check if resource has expired
resource_expired {
  input.resource.policy_expiry_date
  time.now_ns() > time.parse_rfc3339_ns(input.resource.policy_expiry_date)
}

# Check if access is during business hours (optional constraint)
is_business_hours {
  hour := time.clock([time.now_ns()])[0]
  hour >= 8
  hour <= 18
}

# Check if user is from same jurisdiction as resource
same_jurisdiction {
  input.user.residency == input.resource.policy_jurisdiction
}
