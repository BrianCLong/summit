# Tests for privacy.rego

package intelgraph.privacy_test

import future.keywords.if
import future.keywords.in

import data.intelgraph.privacy

# ── PII access control ──────────────────────────────────────

test_has_pii_access_with_permission if {
	privacy.has_pii_access with input as {
		"user": {"permissions": ["pii:read"], "roles": []},
	}
}

test_has_pii_access_super_admin if {
	privacy.has_pii_access with input as {
		"user": {"permissions": [], "roles": ["super_admin"]},
	}
}

test_no_pii_access_regular_user if {
	not privacy.has_pii_access with input as {
		"user": {"permissions": ["entity:read"], "roles": ["analyst"]},
	}
}

# ── Redaction ────────────────────────────────────────────────

test_redact_pii_fields if {
	result := privacy.redact_attributes({"name": "John", "ssn": "123-45-6789", "city": "NYC", "email": "j@e.com"})
	result.name == "John"
	result.city == "NYC"
	not result.ssn
	not result.email
}

test_redact_pii_entity_without_access if {
	result := privacy.redact_pii({"id": "e1", "type": "person", "name": "John Doe", "attributes": {"ssn": "123", "city": "NYC"}}) with input as {
		"user": {"permissions": [], "roles": ["analyst"]},
	}
	result.name == "[REDACTED]"
	result.attributes.city == "NYC"
	not result.attributes.ssn
}

test_no_redaction_with_pii_access if {
	result := privacy.redact_pii({"id": "e1", "type": "person", "name": "John Doe", "attributes": {"ssn": "123", "city": "NYC"}}) with input as {
		"user": {"permissions": ["pii:read"], "roles": []},
	}
	result.name == "John Doe"
	result.attributes.ssn == "123"
}

# ── k-Anonymity ─────────────────────────────────────────────

test_generalize_age if {
	privacy.generalize_age(27) == "25-29"
}

test_generalize_age_boundary if {
	privacy.generalize_age(30) == "30-34"
}

test_generalize_zip if {
	privacy.generalize_zip("10001") == "100***"
}

test_meets_k_anonymity if {
	privacy.meets_k_anonymity(5, 5)
}

test_fails_k_anonymity if {
	not privacy.meets_k_anonymity(3, 5)
}

# ── Data minimization ───────────────────────────────────────

test_minimize_entity if {
	result := privacy.minimize({"id": "e1", "type": "person", "name": "John", "ssn": "123"}, {"id", "type"})
	result.id == "e1"
	result.type == "person"
	not result.name
	not result.ssn
}

# ── Export risk classification ───────────────────────────────

test_export_risk_high_with_pii if {
	privacy.export_risk == "high" with input as {
		"exportFields": ["name", "ssn", "city"],
		"user": {"permissions": [], "roles": []},
	}
}

test_export_risk_medium_with_quasi if {
	privacy.export_risk == "medium" with input as {
		"exportFields": ["name", "zip_code"],
		"user": {"permissions": [], "roles": []},
	}
}

test_export_risk_low_no_sensitive if {
	privacy.export_risk == "low" with input as {
		"exportFields": ["id", "type"],
		"user": {"permissions": [], "roles": []},
	}
}

# ── Deny rules ───────────────────────────────────────────────

test_deny_pii_access_without_permission if {
	"pii_access_denied" in privacy.deny with input as {
		"user": {"permissions": [], "roles": ["analyst"]},
		"operation": "READ",
		"requestedFields": ["ssn", "name"],
	}
}

test_deny_export_pii_without_permission if {
	"export_pii_without_permission" in privacy.deny with input as {
		"user": {"permissions": [], "roles": ["analyst"]},
		"operation": "EXPORT",
		"exportFields": ["email", "phone"],
	}
}

test_deny_k_anonymity_violation if {
	"k_anonymity_violation" in privacy.deny with input as {
		"user": {"permissions": [], "roles": ["analyst"]},
		"operation": "READ",
		"requestedFields": ["zip_code"],
		"queryResultSize": 3,
	}
}
