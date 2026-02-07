import future.keywords
# CompanyOS Identity Fabric - Data Redaction Policy
# Version: 1.0.0
#
# Defines redaction rules for:
# - Log sanitization
# - Export data masking
# - PII protection
# - Classification-based redaction

package companyos.authz.redaction

import rego.v1

# ============================================================================
# Redaction Decision
# ============================================================================

default requires_redaction := false

# ============================================================================
# When Redaction is Required
# ============================================================================

requires_redaction if {
    external_destination
    contains_sensitive_data
}

requires_redaction if {
    log_context
    contains_pii
}

requires_redaction if {
    export_context
    not has_full_access_clearance
}

requires_redaction if {
    clearance_mismatch
}

requires_redaction if {
    cross_tenant_context
}

# ============================================================================
# Context Detection
# ============================================================================

external_destination if {
    input.context.destination_type == "external"
}

external_destination if {
    input.context.destination_type == "api"
    not input.context.destination_internal
}

log_context if {
    input.context.type == "logging"
}

export_context if {
    input.action in ["export", "bulk_export", "download"]
}

cross_tenant_context if {
    input.subject.tenant_id != input.resource.tenant_id
}

# ============================================================================
# Data Sensitivity Detection
# ============================================================================

contains_sensitive_data if {
    input.resource.classification in ["confidential", "secret", "top-secret", "top-secret-sci"]
}

contains_sensitive_data if {
    some tag in input.resource.tags
    tag in ["pii", "phi", "pci", "sensitive", "restricted"]
}

contains_pii if {
    "pii" in input.resource.tags
}

contains_pii if {
    input.resource.contains_pii == true
}

contains_pii if {
    # Check for PII field patterns in data
    some field in pii_fields
    field in object.keys(input.data)
}

pii_fields := [
    "email", "phone", "ssn", "social_security",
    "date_of_birth", "dob", "address", "passport",
    "driver_license", "credit_card", "bank_account",
    "ip_address", "device_id", "biometric"
]

# ============================================================================
# Clearance Checks
# ============================================================================

has_full_access_clearance if {
    input.subject.clearance == "top-secret-sci"
}

has_full_access_clearance if {
    "global-admin" in input.subject.roles
    input.subject.mfa_verified == true
}

clearance_mismatch if {
    clearance_levels[input.subject.clearance] < clearance_levels[input.resource.classification]
}

clearance_levels := {
    "unclassified": 0,
    "cui": 1,
    "confidential": 2,
    "secret": 3,
    "top-secret": 4,
    "top-secret-sci": 5
}

# ============================================================================
# Redaction Rules by Data Type
# ============================================================================

redaction_rules := rules if {
    requires_redaction
    rules := array.concat(
        array.concat(pii_rules, classification_rules),
        array.concat(log_rules, export_rules)
    )
}

redaction_rules := [] if {
    not requires_redaction
}

# PII Redaction Rules
pii_rules := rules if {
    contains_pii
    rules := [
        {
            "path": "$.email",
            "strategy": "mask",
            "pattern": "***@***.***"
        },
        {
            "path": "$.phone",
            "strategy": "mask",
            "pattern": "***-***-****"
        },
        {
            "path": "$.ssn",
            "strategy": "hash",
            "algorithm": "sha256"
        },
        {
            "path": "$.date_of_birth",
            "strategy": "mask",
            "pattern": "****-**-**"
        },
        {
            "path": "$.address",
            "strategy": "remove"
        },
        {
            "path": "$.credit_card",
            "strategy": "mask",
            "pattern": "****-****-****-####"
        },
        {
            "path": "$.ip_address",
            "strategy": "hash",
            "algorithm": "sha256"
        }
    ]
}

pii_rules := [] if {
    not contains_pii
}

# Classification-Based Redaction
classification_rules := rules if {
    clearance_mismatch
    rules := [
        {
            "path": "$.classified_content",
            "strategy": "remove"
        },
        {
            "path": "$.source_methods",
            "strategy": "remove"
        },
        {
            "path": "$.intelligence_value",
            "strategy": "mask",
            "pattern": "[REDACTED]"
        }
    ]
}

classification_rules := [] if {
    not clearance_mismatch
}

# Log Sanitization Rules
log_rules := rules if {
    log_context
    rules := [
        {
            "path": "$.password",
            "strategy": "remove"
        },
        {
            "path": "$.token",
            "strategy": "mask",
            "pattern": "***...***"
        },
        {
            "path": "$.api_key",
            "strategy": "mask",
            "pattern": "***...***"
        },
        {
            "path": "$.secret",
            "strategy": "remove"
        },
        {
            "path": "$.credentials",
            "strategy": "remove"
        },
        {
            "path": "$.authorization",
            "strategy": "mask",
            "pattern": "Bearer ***"
        },
        {
            "path": "$.cookie",
            "strategy": "remove"
        }
    ]
}

log_rules := [] if {
    not log_context
}

# Export Redaction Rules
export_rules := rules if {
    export_context
    external_destination
    rules := [
        {
            "path": "$.internal_id",
            "strategy": "hash",
            "algorithm": "sha256"
        },
        {
            "path": "$.tenant_internal_data",
            "strategy": "remove"
        },
        {
            "path": "$.audit_trail",
            "strategy": "remove"
        },
        {
            "path": "$.system_metadata",
            "strategy": "remove"
        }
    ]
}

export_rules := [] if {
    not export_context
}

export_rules := [] if {
    not external_destination
}

# ============================================================================
# Field-Level Redaction for Logs
# ============================================================================

# Fields that should always be redacted in logs
always_redact_in_logs := [
    "password",
    "secret",
    "api_key",
    "token",
    "credentials",
    "private_key",
    "session_id",
    "refresh_token"
]

# Fields that should be masked (partial redaction) in logs
mask_in_logs := [
    "email",
    "phone",
    "ip_address",
    "user_agent"
]

# ============================================================================
# Decision Output
# ============================================================================

decision := {
    "requires_redaction": requires_redaction,
    "rules": redaction_rules,
    "reason": reason,
    "context": {
        "external": external_destination,
        "log": log_context,
        "export": export_context,
        "cross_tenant": cross_tenant_context,
        "contains_pii": contains_pii,
        "contains_sensitive": contains_sensitive_data
    }
}

reason := "No redaction required" if {
    not requires_redaction
}

reason := "PII protection required" if {
    requires_redaction
    contains_pii
}

reason := "Classification-based redaction" if {
    requires_redaction
    clearance_mismatch
}

reason := "External destination redaction" if {
    requires_redaction
    external_destination
}

reason := "Log sanitization required" if {
    requires_redaction
    log_context
}

# ============================================================================
# Policy Metadata
# ============================================================================

policy_metadata := {
    "version": "1.0.0",
    "name": "companyos-redaction",
    "description": "Data Redaction Rules for CompanyOS",
    "last_updated": "2025-01-01T00:00:00Z"
}
