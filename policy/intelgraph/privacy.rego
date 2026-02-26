# Privacy and PII Redaction Policies for IntelGraph
# Implements PII redaction, k-anonymity helpers, and data minimization.

package intelgraph.privacy

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# ── PII field definitions ────────────────────────────────────

pii_fields := {"ssn", "dob", "email", "phone", "address", "passport", "national_id", "bank_account", "ip_address"}

quasi_identifier_fields := {"age", "gender", "zip_code", "city", "occupation", "nationality"}

# ── PII access control ──────────────────────────────────────

default has_pii_access := false

has_pii_access if {
	"pii:read" in input.user.permissions
}

has_pii_access if {
	"super_admin" in input.user.roles
}

# ── Redaction functions ──────────────────────────────────────

# Redact PII fields from entity attributes
redact_pii(entity) := redacted if {
	not has_pii_access
	redacted := {
		"id": entity.id,
		"type": entity.type,
		"name": "[REDACTED]",
		"attributes": redact_attributes(entity.attributes),
	}
}

redact_pii(entity) := entity if {
	has_pii_access
}

# Redact individual value
redact_value(_) := "[REDACTED]"

# Redact PII keys from attribute map
redact_attributes(attrs) := {k: v |
	some k, v in attrs
	not k in pii_fields
}

# ── Data minimization ───────────────────────────────────────

# Return only the fields required for the operation
minimize(entity, required_fields) := {k: v |
	some k, v in entity
	k in required_fields
}

# Default required fields per operation
operation_required_fields := {
	"list": {"id", "type", "tenantId"},
	"summary": {"id", "type", "tenantId", "name", "createdAt"},
	"detail": {"id", "type", "tenantId", "name", "attributes", "createdAt", "updatedAt"},
	"export": {"id", "type", "tenantId", "name", "attributes", "createdAt", "updatedAt", "metadata"},
}

# ── k-Anonymity helpers ─────────────────────────────────────

# Generalize age to 5-year bucket (use modulo for integer floor division)
generalize_age(age) := bucket if {
	age >= 0
	lower := age - (age % 5)
	upper := lower + 4
	bucket := sprintf("%d-%d", [lower, upper])
}

# Generalize zip code to 3-digit prefix
generalize_zip(zip) := prefix if {
	count(zip) >= 3
	prefix := sprintf("%s***", [substring(zip, 0, 3)])
}

# Check if a dataset meets k-anonymity threshold
meets_k_anonymity(group_size, k) if {
	group_size >= k
}

# Default k value for IntelGraph
default_k := 5

# ── Export classification ────────────────────────────────────

# Classify export risk based on content
default export_risk := "low"

export_risk := "high" if {
	some field in pii_fields
	field in input.exportFields
}

export_risk := "medium" if {
	some field in quasi_identifier_fields
	field in input.exportFields
	not export_risk_is_high
}

export_risk_is_high if {
	some field in pii_fields
	field in input.exportFields
}

# ── Deny rules ───────────────────────────────────────────────

deny contains "pii_access_denied" if {
	not has_pii_access
	input.operation == "READ"
	some field in input.requestedFields
	field in pii_fields
}

deny contains "export_pii_without_permission" if {
	not has_pii_access
	input.operation == "EXPORT"
	some field in input.exportFields
	field in pii_fields
}

deny contains "k_anonymity_violation" if {
	input.queryResultSize
	input.queryResultSize < default_k
	input.operation == "READ"
	some field in input.requestedFields
	field in quasi_identifier_fields
}

# ── Decision bundle ──────────────────────────────────────────

decision := {
	"has_pii_access": has_pii_access,
	"export_risk": export_risk,
	"deny": deny,
}
