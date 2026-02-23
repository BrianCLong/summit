# ============================================================================
# IntelGraph ABAC Authorization Policy
# Main allow policy that orchestrates all authorization checks
# ============================================================================

package intelgraph.abac

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
  input.user.roles[_] == "super_admin"
}

# ============================================================================
# RBAC PERMISSION CHECK
# ============================================================================

rbac_permission_check {
  has_permission(input.user.roles, input.resource.type, input.operation_type)
}

has_permission(roles, resource_type, operation) {
  roles[_] == "admin"  # Admin has all permissions
}

has_permission(roles, resource_type, operation) {
  role := roles[_]
  permission := concat(":", [resource_type, operation])
  data.rbac.role_permissions[role][_] == permission
}

has_permission(roles, resource_type, operation) {
  role := roles[_]
  wildcard := concat(":", [resource_type, "*"])
  data.rbac.role_permissions[role][_] == wildcard
}

has_permission(roles, _, _) {
  roles[_] == "*"
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
  input.user.clearance_levels[_] == "internal"
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "confidential"
  input.user.clearance_levels[_] == "confidential"
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "restricted"
  input.user.clearance_levels[_] == "restricted"
}

resource_sensitivity_allowed {
  input.resource.policy_sensitivity == "top_secret"
  input.user.clearance_levels[_] == "top_secret"
}

# Validate that resource has a valid legal basis
legal_basis_valid {
  not input.resource.policy_legal_basis
}

legal_basis_valid {
  count(input.resource.policy_legal_basis) > 0
  valid_legal_bases := {"investigation", "court_order", "consent", "legitimate_interest", "legal_obligation", "public_interest"}
  basis := input.resource.policy_legal_basis[_]
  valid_legal_bases[basis]
}

# Check if request purpose aligns with resource purposes
purpose_alignment_valid {
  not input.resource.policy_purpose
}

purpose_alignment_valid {
  count(input.resource.policy_purpose) == 0
}

purpose_alignment_valid {
  resource_purpose := input.resource.policy_purpose[_]
  request_purpose := input.context.purposes[_]
  resource_purpose == request_purpose
}

# Allow if user has wildcard purpose scope
purpose_alignment_valid {
  input.user.scopes[_] == "purpose:*"
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
  sensitivity_high := {"restricted", "top_secret"}
  sensitivity_high[input.resource.policy_sensitivity]
}

requires_warrant {
  input.resource.policy_legal_basis[_] == "court_order"
}

requires_warrant {
  input.operation_type == "export"
  input.resource.policy_data_classification == "pii"
}

requires_warrant {
  input.operation_type == "export"
  sensitivity_conf := {"confidential", "restricted", "top_secret"}
  sensitivity_conf[input.resource.policy_sensitivity]
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
  purpose_allowed(input.context.purpose, input.operation_type)
}

purpose_allowed(purpose, operation) {
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

  combo := valid_combinations[_]
  combo.purpose == purpose
  combo.operations[operation]
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
  input.user.scopes[_] == "scope:global_data"
}

# ============================================================================
# DENY REASONS (for audit and user feedback)
# ============================================================================

deny_reason["tenant_isolation_violation"] {
  not tenant_isolation_check
}

deny_reason["insufficient_rbac_permissions"] {
  not rbac_permission_check
}

deny_reason["insufficient_clearance"] {
  not resource_sensitivity_allowed
}

deny_reason["invalid_legal_basis"] {
  not legal_basis_valid
}

deny_reason["purpose_mismatch"] {
  not purpose_alignment_valid
}

deny_reason["warrant_required"] {
  requires_warrant
  not input.context.warrant_id
}

deny_reason["invalid_warrant"] {
  requires_warrant
  input.context.warrant_id
  not warrant_is_valid
}

deny_reason["purpose_not_allowed"] {
  not purpose_limitation_check
}

deny_reason["jurisdiction_mismatch"] {
  not data_residency_check
}

# ============================================================================
# FIELD-LEVEL REDACTIONS
# ============================================================================

redact_fields[field_name] {
  # Redact PII fields if user doesn't have PII scope
  input.resource.policy_pii_flags
  not user_has_pii_scope
  field_name := "email"
  input.resource.policy_pii_flags.has_emails == true
}

user_has_pii_scope {
    input.user.scopes[_] == "scope:pii"
}

redact_fields[field_name] {
  input.resource.policy_pii_flags
  not user_has_pii_scope
  field_name := "phone"
  input.resource.policy_pii_flags.has_phones == true
}

redact_fields[field_name] {
  input.resource.policy_pii_flags
  not user_has_pii_scope
  field_name := "ssn"
  input.resource.policy_pii_flags.has_ssn == true
}

redact_fields[field_name] {
  input.resource.policy_pii_flags
  not user_has_pii_scope
  field_name := "address"
  input.resource.policy_pii_flags.has_addresses == true
}

# Redact sensitive fields based on clearance
redact_fields[field_name] {
  input.resource.policy_sensitivity == "restricted"
  not user_has_restricted_clearance
  sensitive_fields := {"intelligence_source", "classified_notes", "source_identity"}
  field_name := sensitive_fields[_]
}

user_has_restricted_clearance {
    input.user.clearance_levels[_] == "restricted"
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
