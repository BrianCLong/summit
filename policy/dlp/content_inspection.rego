# Content Inspection Policy
# DLP rules for content scanning, classification, and enforcement actions
#
# @package dlp.content
# @version 1.0.0

package dlp.content

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Default decisions
default allow := false
default action := "BLOCK"
default requires_redaction := false

# =============================================================================
# DATA TYPE DETECTION
# =============================================================================

# Sensitive data types detected in content
detected_data_types contains data_type if {
    detection := input.detections[_]
    data_type := detection.type
}

# High-risk data types that require special handling
high_risk_types := {
    "SSN",
    "CREDIT_CARD",
    "BANK_ACCOUNT",
    "PASSPORT",
    "DRIVER_LICENSE",
    "API_KEY",
    "PASSWORD",
    "PHI",
    "BIOMETRIC"
}

# Moderate-risk data types
moderate_risk_types := {
    "EMAIL",
    "PHONE",
    "DATE_OF_BIRTH",
    "ADDRESS",
    "IP_ADDRESS",
    "FINANCIAL_DATA"
}

# Contains high-risk data
contains_high_risk if {
    some data_type in detected_data_types
    data_type in high_risk_types
}

# Contains moderate-risk data
contains_moderate_risk if {
    some data_type in detected_data_types
    data_type in moderate_risk_types
}

# =============================================================================
# CONTEXT-BASED RULES
# =============================================================================

# Legitimate purposes that may allow sensitive data handling
legitimate_purposes := {
    "LEGAL_DISCOVERY",
    "COMPLIANCE_AUDIT",
    "REGULATORY_FILING",
    "FRAUD_INVESTIGATION",
    "CUSTOMER_REQUEST_VERIFIED",
    "SECURITY_INCIDENT_RESPONSE"
}

# Check if purpose is legitimate
legitimate_purpose if {
    input.context.purpose in legitimate_purposes
}

# Check if step-up authentication is verified
step_up_verified if {
    input.actor.step_up_verified == true
    input.actor.step_up_timestamp > (time.now_ns() - (3600 * 1000000000)) # Within 1 hour
}

# Check if justification is provided
has_justification if {
    input.context.justification
    count(input.context.justification) >= 50
}

# Check if approval is obtained
has_approval if {
    input.context.approval_id
    approval := data.approvals[input.context.approval_id]
    approval.status == "APPROVED"
    approval.valid_until >= time.now_ns()
}

# =============================================================================
# OPERATION TYPE RULES
# =============================================================================

# Operation types and their risk levels
operation_risk := {
    "READ": 1,
    "SEARCH": 1,
    "LIST": 1,
    "CREATE": 2,
    "UPDATE": 2,
    "EXPORT": 3,
    "DOWNLOAD": 3,
    "SHARE": 4,
    "EXTERNAL_TRANSFER": 5,
    "BULK_EXPORT": 5,
    "DELETE": 3
}

# Get operation risk level
op_risk_level := operation_risk[input.operation] if {
    input.operation
} else := 1

# High-risk operations
high_risk_operation if {
    op_risk_level >= 4
}

# =============================================================================
# DESTINATION RULES
# =============================================================================

# Blocked destinations
blocked_destinations := data.dlp.blocked_destinations

# Allowed external destinations (whitelist)
allowed_external := data.dlp.allowed_external_destinations

# Check destination safety
destination_allowed if {
    input.destination.type == "INTERNAL"
}

destination_allowed if {
    input.destination.type == "EXTERNAL"
    input.destination.domain in allowed_external
}

destination_blocked if {
    input.destination.domain in blocked_destinations
}

destination_violation := {
    "type": "BLOCKED_DESTINATION",
    "message": sprintf("Destination %s is blocked by policy", [input.destination.domain]),
    "severity": "CRITICAL",
    "destination": input.destination.domain
} if {
    destination_blocked
}

# =============================================================================
# VOLUME & AGGREGATION RULES
# =============================================================================

# Bulk operation thresholds
bulk_thresholds := {
    "records": 1000,
    "pii_records": 100,
    "high_risk_records": 10
}

# Check if operation is bulk
is_bulk_operation if {
    input.volume.record_count > bulk_thresholds.records
}

is_bulk_pii if {
    input.volume.pii_record_count > bulk_thresholds.pii_records
}

is_bulk_high_risk if {
    input.volume.high_risk_count > bulk_thresholds.high_risk_records
}

bulk_violation := {
    "type": "BULK_OPERATION",
    "message": sprintf("Bulk operation exceeds threshold: %d records", [input.volume.record_count]),
    "severity": "HIGH",
    "threshold": bulk_thresholds.records,
    "actual": input.volume.record_count,
    "requires": "APPROVAL_REQUIRED"
} if {
    is_bulk_operation
    not has_approval
}

# Aggregation detection (combining quasi-identifiers can reveal identity)
aggregation_risk if {
    quasi_identifiers := {d | d := detected_data_types[_]; d in {"DATE_OF_BIRTH", "ZIP_CODE", "GENDER", "ETHNICITY"}}
    count(quasi_identifiers) >= 3
}

aggregation_violation := {
    "type": "AGGREGATION_RISK",
    "message": "Combination of quasi-identifiers may enable re-identification",
    "severity": "HIGH",
    "identifiers_found": count({d | d := detected_data_types[_]; d in {"DATE_OF_BIRTH", "ZIP_CODE", "GENDER", "ETHNICITY"}}),
    "recommendation": "Apply k-anonymity or remove some identifiers"
} if {
    aggregation_risk
}

# =============================================================================
# TEMPORAL RULES
# =============================================================================

# Business hours check (UTC)
during_business_hours if {
    t := time.clock([time.now_ns(), "UTC"])
    t[0] >= 8  # After 8 AM
    t[0] < 18  # Before 6 PM

    # Check weekday (1=Monday, 7=Sunday)
    d := time.weekday(time.now_ns())
    d >= 1
    d <= 5
}

# Off-hours access to sensitive data
off_hours_sensitive := {
    "type": "OFF_HOURS_ACCESS",
    "message": "Access to sensitive data outside business hours",
    "severity": "MEDIUM",
    "recommendation": "Consider scheduling for business hours"
} if {
    contains_high_risk
    not during_business_hours
    not input.context.emergency
}

# =============================================================================
# ACTION DETERMINATION
# =============================================================================

# Determine the appropriate action based on context and content

# ALLOW: No sensitive data, or legitimate purpose with proper authorization
action := "ALLOW" if {
    not contains_high_risk
    not contains_moderate_risk
}

action := "ALLOW" if {
    legitimate_purpose
    step_up_verified
    has_justification
    destination_allowed
}

# REDACT: Moderate risk data in routine operations
action := "REDACT" if {
    contains_moderate_risk
    not contains_high_risk
    input.operation in {"READ", "SEARCH", "LIST"}
    destination_allowed
}

action := "REDACT" if {
    contains_high_risk
    legitimate_purpose
    step_up_verified
    input.context.redaction_acceptable == true
}

# WARN: Elevated risk but may be legitimate
action := "WARN" if {
    contains_moderate_risk
    high_risk_operation
    not has_approval
    destination_allowed
}

# REQUIRE_JUSTIFICATION: High risk requires explanation
action := "REQUIRE_JUSTIFICATION" if {
    contains_high_risk
    not has_justification
    legitimate_purpose
}

action := "REQUIRE_JUSTIFICATION" if {
    is_bulk_pii
    not has_approval
}

# REQUIRE_APPROVAL: Very high risk requires manager/compliance approval
action := "REQUIRE_APPROVAL" if {
    contains_high_risk
    high_risk_operation
    has_justification
    not has_approval
}

action := "REQUIRE_APPROVAL" if {
    is_bulk_high_risk
    has_justification
    not has_approval
}

# BLOCK: Violations that cannot be mitigated
action := "BLOCK" if {
    destination_blocked
}

action := "BLOCK" if {
    contains_high_risk
    input.destination.type == "EXTERNAL"
    not input.destination.domain in allowed_external
}

action := "BLOCK" if {
    input.resource.classification == "TOP_SECRET"
    input.operation in {"EXPORT", "EXTERNAL_TRANSFER", "SHARE"}
}

# =============================================================================
# REDACTION REQUIREMENTS
# =============================================================================

requires_redaction if {
    action == "REDACT"
}

requires_redaction if {
    action == "ALLOW"
    input.apply_default_redaction == true
    contains_moderate_risk
}

# Redaction configuration based on data type
redaction_config[data_type] := config if {
    data_type := detected_data_types[_]
    config := data.dlp.redaction_rules[data_type]
}

# Default redaction if specific config not found
default_redaction := {
    "strategy": "FULL_MASK",
    "mask_char": "*",
    "preserve_format": true
}

# =============================================================================
# ALLOW DECISION
# =============================================================================

allow if {
    action in {"ALLOW", "REDACT", "WARN"}
    not destination_blocked
    count(critical_violations) == 0
}

# =============================================================================
# VIOLATIONS COLLECTION
# =============================================================================

violations contains v if {
    v := destination_violation
}

violations contains v if {
    v := bulk_violation
}

violations contains v if {
    v := aggregation_violation
}

violations contains v if {
    v := off_hours_sensitive
}

# Critical violations that always block
critical_violations contains v if {
    v := violations[_]
    v.severity == "CRITICAL"
}

# =============================================================================
# DECISION OUTPUT
# =============================================================================

# Obligations that must be fulfilled
obligations contains obligation if {
    action == "REDACT"
    obligation := {
        "type": "REDACT",
        "config": redaction_config
    }
}

obligations contains obligation if {
    action == "WARN"
    obligation := {
        "type": "USER_ACKNOWLEDGMENT",
        "message": "You are about to access/transfer sensitive data",
        "timeout": 30
    }
}

obligations contains obligation if {
    action == "REQUIRE_JUSTIFICATION"
    obligation := {
        "type": "JUSTIFICATION_REQUIRED",
        "min_length": 50,
        "fields": ["purpose", "business_need", "authorization_reference"]
    }
}

obligations contains obligation if {
    action == "REQUIRE_APPROVAL"
    obligation := {
        "type": "APPROVAL_REQUIRED",
        "approvers": ["manager", "data_owner"],
        "sla_hours": 24
    }
}

obligations contains obligation if {
    high_risk_operation
    obligation := {
        "type": "AUDIT_ENHANCED",
        "capture": ["full_content_hash", "destination_details", "actor_context"]
    }
}

# Final decision object
decision := {
    "allowed": allow,
    "action": action,
    "requires_redaction": requires_redaction,
    "redaction_config": redaction_config,
    "violations": violations,
    "obligations": obligations,
    "detected_types": detected_data_types,
    "risk_assessment": {
        "contains_high_risk": contains_high_risk,
        "contains_moderate_risk": contains_moderate_risk,
        "operation_risk": op_risk_level,
        "is_bulk": is_bulk_operation
    },
    "context": {
        "legitimate_purpose": legitimate_purpose,
        "step_up_verified": step_up_verified,
        "has_justification": has_justification,
        "has_approval": has_approval,
        "during_business_hours": during_business_hours
    },
    "timestamp": time.now_ns()
}
