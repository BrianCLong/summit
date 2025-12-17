# Safe Analytics Workbench - Egress Policies
#
# OPA Rego policies for data export and egress control.

package analytics.egress

import future.keywords.in
import future.keywords.if
import future.keywords.contains

# ============================================================================
# Default Deny
# ============================================================================

default allow := false

# ============================================================================
# Small Export Auto-Approval
# ============================================================================

# Allow small exports without explicit approval
allow if {
    input.action == "EXPORT"
    input.export.row_count <= 1000
    input.export.byte_size <= 10485760  # 10 MB
    not contains_pii
    not contains_sensitive
    not contains_restricted
    within_daily_limit
    allowed_format
    allowed_destination
}

# ============================================================================
# Role-Based Export Limits
# ============================================================================

# Data scientists get higher limits
allow if {
    input.action == "EXPORT"
    input.user.roles[_] == "data_scientist"
    input.export.row_count <= 1000000
    input.export.byte_size <= 1073741824  # 1 GB
    not contains_restricted
    within_daily_limit
    allowed_format
    allowed_destination
    not requires_pii_approval
}

# Engineers get highest limits
allow if {
    input.action == "EXPORT"
    input.user.roles[_] == "engineer"
    input.export.row_count <= 10000000
    input.export.byte_size <= 10737418240  # 10 GB
    within_daily_limit
    allowed_format
    allowed_destination
}

# ============================================================================
# Approved Exports
# ============================================================================

# Larger or sensitive exports require explicit approval
allow if {
    input.action == "EXPORT"
    has_export_approval
}

has_export_approval if {
    approval := input.user.approvals[_]
    approval.type == "EXPORT_REQUEST"
    approval.export_id == input.export.id
    approval.status == "APPROVED"
    time.now_ns() < approval.expires_at_ns
}

# ============================================================================
# Data Classification Checks
# ============================================================================

contains_pii if {
    col := input.export.columns[_]
    col.classification == "PII"
}

contains_sensitive if {
    col := input.export.columns[_]
    col.classification == "SENSITIVE"
}

contains_restricted if {
    col := input.export.columns[_]
    col.classification == "RESTRICTED"
}

requires_pii_approval if {
    contains_pii
    not has_pii_export_approval
}

has_pii_export_approval if {
    approval := input.user.approvals[_]
    approval.type == "PII_EXPORT"
    approval.status == "APPROVED"
    time.now_ns() < approval.expires_at_ns
}

# ============================================================================
# Rate Limiting
# ============================================================================

within_daily_limit if {
    daily_limit := daily_export_limits[input.user.roles[0]]
    input.user.daily_export_rows + input.export.row_count <= daily_limit
}

daily_export_limits := {
    "analyst": 100000,
    "data_scientist": 10000000,
    "engineer": 100000000,
    "auditor": 0,  # Auditors cannot export
}

# ============================================================================
# Format and Destination Restrictions
# ============================================================================

allowed_format if {
    formats := allowed_formats[input.user.roles[0]]
    input.export.format in formats
}

allowed_formats := {
    "analyst": ["CSV", "XLSX"],
    "data_scientist": ["CSV", "JSON", "PARQUET"],
    "engineer": ["CSV", "JSON", "PARQUET", "XLSX"],
    "auditor": [],
}

allowed_destination if {
    destinations := allowed_destinations[input.user.roles[0]]
    input.export.destination in destinations
}

allowed_destinations := {
    "analyst": ["LOCAL"],
    "data_scientist": ["LOCAL", "S3"],
    "engineer": ["LOCAL", "S3", "GCS"],
    "auditor": [],
}

# ============================================================================
# Auditor Export Block
# ============================================================================

# Auditors can never export data
deny if {
    input.action == "EXPORT"
    input.user.roles[_] == "auditor"
}

# ============================================================================
# Watermarking Requirements
# ============================================================================

requires_watermark if {
    input.export.row_count > 100
}

requires_watermark if {
    contains_pii
}

requires_watermark if {
    input.export.destination != "LOCAL"
}

watermark_config := {
    "user_id": input.user.id,
    "workspace_id": input.workspace.id,
    "timestamp": time.now_ns(),
    "export_id": input.export.id,
}

# ============================================================================
# Export Restrictions by Dataset Tier
# ============================================================================

tier_export_allowed if {
    input.dataset.tier == "SYNTHETIC"
}

tier_export_allowed if {
    input.dataset.tier == "ANONYMIZED"
}

tier_export_allowed if {
    input.dataset.tier == "CURATED"
    has_dataset_export_permission
}

tier_export_allowed if {
    input.dataset.tier == "RAW"
    has_raw_export_approval
}

has_dataset_export_permission if {
    grant := input.user.dataset_grants[_]
    grant.dataset_id == input.dataset.id
    grant.export_allowed == true
}

has_raw_export_approval if {
    approval := input.user.approvals[_]
    approval.type == "RAW_DATA_EXPORT"
    approval.dataset_id == input.dataset.id
    approval.status == "APPROVED"
    time.now_ns() < approval.expires_at_ns
}

# ============================================================================
# Anomaly Detection Flags
# ============================================================================

anomaly_flags contains "UNUSUAL_VOLUME" if {
    input.export.row_count > input.user.avg_export_rows * 3
}

anomaly_flags contains "OFF_HOURS" if {
    current_hour := time.clock([time.now_ns(), "UTC"])[0]
    current_hour < 6
}

anomaly_flags contains "OFF_HOURS" if {
    current_hour := time.clock([time.now_ns(), "UTC"])[0]
    current_hour > 22
}

anomaly_flags contains "NEW_DESTINATION" if {
    not input.export.destination in input.user.previous_destinations
}

anomaly_flags contains "BULK_PII" if {
    contains_pii
    input.export.row_count > 10000
}

requires_additional_review if {
    count(anomaly_flags) > 0
}

# ============================================================================
# Masking Requirements for Export
# ============================================================================

export_masking_rules[column] := rule if {
    col := input.export.columns[_]
    col.name == column
    col.classification == "PII"
    input.user.roles[_] == "analyst"
    rule := {"type": "MASK", "pattern": "***"}
}

export_masking_rules[column] := rule if {
    col := input.export.columns[_]
    col.name == column
    col.pii_type in ["SSN", "FINANCIAL"]
    rule := {"type": "REDACT", "replacement": "[REDACTED]"}
}

export_masking_rules[column] := rule if {
    col := input.export.columns[_]
    col.name == column
    col.classification == "SENSITIVE"
    not input.user.roles[_] in ["data_scientist", "engineer"]
    rule := {"type": "HASH", "algorithm": "SHA256"}
}

# ============================================================================
# Denial Reasons
# ============================================================================

deny_reasons contains "Auditors cannot export data" if {
    input.action == "EXPORT"
    input.user.roles[_] == "auditor"
}

deny_reasons contains "Export exceeds row limit for your role" if {
    input.action == "EXPORT"
    not within_daily_limit
}

deny_reasons contains "Export format not allowed for your role" if {
    input.action == "EXPORT"
    not allowed_format
}

deny_reasons contains "Export destination not allowed for your role" if {
    input.action == "EXPORT"
    not allowed_destination
}

deny_reasons contains "Restricted data cannot be exported" if {
    input.action == "EXPORT"
    contains_restricted
    not input.user.roles[_] == "engineer"
}

deny_reasons contains "PII export requires approval" if {
    input.action == "EXPORT"
    contains_pii
    not has_pii_export_approval
    not input.user.roles[_] in ["data_scientist", "engineer"]
}

deny_reasons contains "Raw data export requires approval" if {
    input.action == "EXPORT"
    input.dataset.tier == "RAW"
    not has_raw_export_approval
}
